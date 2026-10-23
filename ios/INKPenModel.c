#include "INKPenModel.h"

#include <math.h>
#include <stdbool.h>
#include <stdlib.h>
#include <string.h>

// Same model as src/geometry/penModel.ts; the shared fixtures keep the two in step.

static const size_t INKStride = 6;
static const double INKHalfWindow = 0.01;
static const double INKUpsamplePeriod = 1.0 / 180.0;
static const double INKMaxDivisions = 100;
static const double INKEpsilon = 0.1;
static const double INKMinSize = 0.5;
static const double INKMaxSize = 200;
static const double INKMaxMultiplier = 2;

typedef enum {
  INKSourceRemaining,
  INKSourceDirectionY,
  INKSourceLateral,
  INKSourcePressure,
  INKSourceSpeed,
} INKSource;

typedef struct {
  INKSource source;
  double start;
  double end;
  bool easeOut;
  double gap;
  double from;
  double to;
  unsigned tools;
} INKBehavior;

#define INKAllTools 0u
#define INKTool(tool) (1u << (tool))

// The size behaviors of androidx.ink's pressurePen plus inkpad's speed thinning, as Android draws the pen.
static const INKBehavior INKBehaviors[] = {
  {INKSourceRemaining, 3, 0, false, 0, 1, 0.75, INKAllTools},
  {INKSourceDirectionY, 0.45, 0.65, false, 0.025, 1, 1.17, INKAllTools},
  {INKSourceLateral, -80, -230, false, 0.025, 1, 1.25, INKAllTools},
  {INKSourcePressure, 0.8, 1, false, 0.03, 1, 1.5, INKTool(INKPenToolStylus)},
  {INKSourceSpeed, 0, 30, true, 0.04, 1, 0.3, INKTool(INKPenToolTouch) | INKTool(INKPenToolMouse)},
};
#define INKBehaviorCount (sizeof(INKBehaviors) / sizeof(INKBehaviors[0]))

typedef struct {
  size_t count;
  const double *t;
  const double *x;
  const double *y;
  const double *p;
} INKRaw;

typedef struct {
  size_t count;
  size_t capacity;
  double *t;
  double *x;
  double *y;
  double *p;
  double *d;
  double *vx;
  double *vy;
  double *ax;
  double *ay;
} INKModeled;

static double INKLerp(double a, double b, double t) { return a + (b - a) * t; }

static double INKInverseLerp(double a, double b, double v) { return a == b ? 0 : (v - a) / (b - a); }

static double INKClamp(double v, double lo, double hi) { return fmin(hi, fmax(lo, v)); }

static double INKLength(double x, double y) { return sqrt(x * x + y * y); }

static bool INKGrow(INKModeled *m)
{
  size_t capacity = m->capacity * 2;
  double **arrays[] = {&m->t, &m->x, &m->y, &m->p, &m->d};
  for (size_t i = 0; i < 5; i++) {
    double *grown = realloc(*arrays[i], sizeof(double) * capacity);
    if (!grown) return false;
    *arrays[i] = grown;
  }
  m->capacity = capacity;
  return true;
}

static bool INKPush(INKModeled *m, double t, double x, double y, double p)
{
  size_t n = m->count;
  double step = n > 0 ? INKLength(x - m->x[n - 1], y - m->y[n - 1]) : 0;
  if (n > 0 && step <= INKEpsilon) return true;
  if (n == m->capacity && !INKGrow(m)) return false;
  m->t[n] = t;
  m->x[n] = x;
  m->y[n] = y;
  m->p[n] = p;
  m->d[n] = n > 0 ? m->d[n - 1] + step : 0;
  m->count = n + 1;
  return true;
}

// Integral over [from, to] of one channel, linear between raw points.
static double INKIntegral(const INKRaw *raw, const double *channel, size_t start, size_t end, double from, double to)
{
  double sum = 0;
  for (size_t i = start; i < end; i++) {
    double ta = raw->t[i];
    double tb = raw->t[i + 1];
    double a = channel[i];
    double b = channel[i + 1];
    double va = ta < from ? INKLerp(a, b, INKInverseLerp(ta, tb, from)) : a;
    double vb = tb > to ? INKLerp(a, b, INKInverseLerp(ta, tb, to)) : b;
    sum += (fmin(tb, to) - fmax(ta, from)) * 0.5 * (va + vb);
  }
  return sum;
}

static bool INKModelAt(const INKRaw *raw, INKModeled *m, double at, size_t *start, size_t *end)
{
  double first = raw->t[0];
  double last = raw->t[raw->count - 1];
  double half = fmin(INKHalfWindow, fmin(at - first, last - at));
  double from = at - half;
  double to = at + half;
  while (*start + 1 < raw->count && raw->t[*start + 1] <= from) (*start)++;
  while (*end + 1 < raw->count && raw->t[*end] <= to) (*end)++;
  double span = to - from;
  if (span <= 0) {
    return INKPush(m, raw->t[*start], raw->x[*start], raw->y[*start], raw->p[*start]);
  }
  double x = INKIntegral(raw, raw->x, *start, *end, from, to) / span;
  double y = INKIntegral(raw, raw->y, *start, *end, from, to) / span;
  double p = INKIntegral(raw, raw->p, *start, *end, from, to) / span;
  return INKPush(m, at, x, y, p);
}

// Average rate of change over the window around each point, clamped to the stroke.
static void INKDerive(const double *t, size_t count, const double *vx, const double *vy, double *outX, double *outY)
{
  double front = t[0];
  double back = t[count - 1];
  size_t start = 0;
  size_t end = 0;
  for (size_t i = 0; i < count; i++) {
    double from = fmax(t[i] - INKHalfWindow, front);
    double to = fmin(t[i] + INKHalfWindow, back);
    double span = to - from;
    if (span == 0) {
      outX[i] = 0;
      outY[i] = 0;
      continue;
    }
    while (start + 1 < count && t[start + 1] <= from) start++;
    while (end + 1 < count && t[end] <= to) end++;
    double sx = vx[start];
    double sy = vy[start];
    if (start + 1 < count) {
      double r = INKInverseLerp(t[start], t[start + 1], from);
      sx = INKLerp(sx, vx[start + 1], r);
      sy = INKLerp(sy, vy[start + 1], r);
    }
    double ex = vx[end];
    double ey = vy[end];
    if (end > 0) {
      double r = INKInverseLerp(t[end - 1], t[end], to);
      ex = INKLerp(vx[end - 1], ex, r);
      ey = INKLerp(vy[end - 1], ey, r);
    }
    outX[i] = (ex - sx) / span;
    outY[i] = (ey - sy) / span;
  }
}

// Ink's sliding window model: trapezoid time averages over the window, upsampled to 180 Hz.
static bool INKModel(const INKRaw *raw, INKModeled *m)
{
  size_t start = 0;
  size_t end = 0;
  double previous = -INFINITY;
  for (size_t i = 0; i < raw->count; i++) {
    double t = raw->t[i];
    if (t <= previous) continue;
    if (isfinite(previous)) {
      double gap = t - previous;
      int divisions = (int)fmin(ceil(gap / INKUpsamplePeriod), INKMaxDivisions);
      for (int k = 1; k < divisions; k++) {
        if (!INKModelAt(raw, m, previous + (gap / divisions) * k, &start, &end)) return false;
      }
    }
    if (!INKModelAt(raw, m, t, &start, &end)) return false;
    previous = t;
  }
  size_t n = m->count;
  m->vx = malloc(sizeof(double) * n);
  m->vy = malloc(sizeof(double) * n);
  m->ax = malloc(sizeof(double) * n);
  m->ay = malloc(sizeof(double) * n);
  if (!m->vx || !m->vy || !m->ax || !m->ay) return false;
  INKDerive(m->t, n, m->x, m->y, m->vx, m->vy);
  INKDerive(m->t, n, m->vx, m->vy, m->ax, m->ay);
  return true;
}

static double INKBezier(double t, double p1, double p2)
{
  return 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
}

// CSS ease-out, cubic-bezier(0, 0, 0.58, 1), solved for x by bisection.
static double INKEaseOut(double x)
{
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  double lo = 0;
  double hi = 1;
  for (int i = 0; i < 24; i++) {
    double mid = (lo + hi) / 2;
    if (INKBezier(mid, 0, 0.58) < x) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return INKBezier((lo + hi) / 2, 0, 1);
}

static bool INKSourceValue(INKSource source, const INKModeled *m, size_t i, double size, double unitLengthCm,
                           bool hasPressure, double *value)
{
  size_t last = m->count - 1;
  switch (source) {
    case INKSourceRemaining:
      *value = (m->d[last] - m->d[i]) / size;
      return true;
    case INKSourceDirectionY: {
      size_t before = i > 0 ? i - 1 : 0;
      size_t after = i < last ? i + 1 : last;
      double dx = m->x[after] - m->x[before];
      double dy = m->y[after] - m->y[before];
      if (dx == 0 && dy == 0) return false;
      *value = dy / INKLength(dx, dy);
      return true;
    }
    case INKSourceLateral: {
      double direction = atan2(m->vy[i], m->vx[i]);
      *value = (m->ax[i] * -sin(direction) + m->ay[i] * cos(direction)) * unitLengthCm;
      return true;
    }
    case INKSourcePressure:
      *value = m->p[i];
      return hasPressure;
    case INKSourceSpeed:
      *value = INKLength(m->vx[i], m->vy[i]) * unitLengthCm;
      return true;
  }
  return false;
}

static void INKFree(INKModeled *m)
{
  free(m->t);
  free(m->x);
  free(m->y);
  free(m->p);
  free(m->d);
  free(m->vx);
  free(m->vy);
  free(m->ax);
  free(m->ay);
}

static void INKWidths(const INKRaw *raw, const INKModeled *m, double size, INKPenTool tool, double unitLengthCm,
                      double *widths)
{
  bool hasPressure = raw->p[0] >= 0;
  double damped[INKBehaviorCount];
  bool hasDamped[INKBehaviorCount];
  double multipliers[INKBehaviorCount];
  for (size_t b = 0; b < INKBehaviorCount; b++) {
    hasDamped[b] = false;
    multipliers[b] = 1;
  }
  size_t j = 0;
  double width = size;
  size_t computed = 0;
  for (size_t r = 0; r < raw->count; r++) {
    while (j + 1 < m->count && m->t[j + 1] <= raw->t[r]) j++;
    for (; computed <= j; computed++) {
      size_t i = computed;
      double dt = i > 0 ? m->t[i] - m->t[i - 1] : 0;
      double product = 1;
      for (size_t b = 0; b < INKBehaviorCount; b++) {
        const INKBehavior *behavior = &INKBehaviors[b];
        if (behavior->tools != INKAllTools && !(behavior->tools & INKTool(tool))) continue;
        double value = 0;
        if (INKSourceValue(behavior->source, m, i, size, unitLengthCm, hasPressure, &value)) {
          double normalized = INKClamp(INKInverseLerp(behavior->start, behavior->end, value), 0, 1);
          if (behavior->easeOut) normalized = INKEaseOut(normalized);
          if (!hasDamped[b] || behavior->gap == 0) {
            damped[b] = normalized;
            hasDamped[b] = true;
          } else if (dt > 0) {
            damped[b] = INKLerp(normalized, damped[b], exp(-dt / behavior->gap));
          }
        }
        if (hasDamped[b]) multipliers[b] = INKLerp(behavior->from, behavior->to, damped[b]);
        product *= multipliers[b];
      }
      width = size * INKClamp(product, 0, INKMaxMultiplier);
    }
    widths[r] = width;
  }
}

void INKPenWidths(const double *points, size_t count, double size, INKPenTool tool, double unitLengthCm,
                  double *widths)
{
  if (count == 0) return;
  double brushSize = INKClamp(size, INKMinSize, INKMaxSize);
  double *rawArrays = malloc(sizeof(double) * count * 4);
  INKModeled m;
  memset(&m, 0, sizeof(m));
  m.capacity = count * 2 + 16;
  m.t = malloc(sizeof(double) * m.capacity);
  m.x = malloc(sizeof(double) * m.capacity);
  m.y = malloc(sizeof(double) * m.capacity);
  m.p = malloc(sizeof(double) * m.capacity);
  m.d = malloc(sizeof(double) * m.capacity);
  bool ok = rawArrays && m.t && m.x && m.y && m.p && m.d;
  if (ok) {
    INKRaw raw = {count, rawArrays, rawArrays + count, rawArrays + count * 2, rawArrays + count * 3};
    for (size_t i = 0; i < count; i++) {
      rawArrays[i] = points[i * INKStride + 2] / 1000.0;
      rawArrays[count + i] = points[i * INKStride];
      rawArrays[count * 2 + i] = points[i * INKStride + 1];
      rawArrays[count * 3 + i] = points[i * INKStride + 3];
    }
    ok = INKModel(&raw, &m);
    if (ok) INKWidths(&raw, &m, brushSize, tool, unitLengthCm, widths);
  }
  if (!ok) {
    for (size_t i = 0; i < count; i++) widths[i] = brushSize;
  }
  free(rawArrays);
  INKFree(&m);
}
