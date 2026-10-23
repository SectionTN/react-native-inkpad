import { type InputType, POINT_STRIDE } from '../document';

// Speed and acceleration are physical in Ink; documents count 160 units per inch, like Android dp.
export const UNIT_LENGTH_CM = 2.54 / 160;

const HALF_WINDOW = 0.01;
const UPSAMPLE_PERIOD = 1 / 180;
const MAX_DIVISIONS = 100;
const EPSILON = 0.1;
const MIN_SIZE = 0.5;
const MAX_SIZE = 200;
const MAX_MULTIPLIER = 2;

type Source = 'remaining' | 'directionY' | 'lateral' | 'pressure' | 'speed';

type Behavior = {
  source: Source;
  start: number;
  end: number;
  easeOut?: boolean;
  gap: number;
  from: number;
  to: number;
  tools?: readonly InputType[];
};

// The size behaviors of androidx.ink's pressurePen plus inkpad's speed thinning, as Android draws the pen.
const BEHAVIORS: readonly Behavior[] = [
  { source: 'remaining', start: 3, end: 0, gap: 0, from: 1, to: 0.75 },
  { source: 'directionY', start: 0.45, end: 0.65, gap: 0.025, from: 1, to: 1.17 },
  { source: 'lateral', start: -80, end: -230, gap: 0.025, from: 1, to: 1.25 },
  { source: 'pressure', start: 0.8, end: 1, gap: 0.03, from: 1, to: 1.5, tools: ['stylus'] },
  {
    source: 'speed',
    start: 0,
    end: 30,
    easeOut: true,
    gap: 0.04,
    from: 1,
    to: 0.3,
    tools: ['touch', 'mouse'],
  },
];

// Raw points as parallel arrays: time (s), position, pressure.
type Raw = { t: Float64Array; x: Float64Array; y: Float64Array; p: Float64Array };

// Modeled points as parallel arrays: time (s), position, pressure, distance, velocity, acceleration.
type Modeled = {
  t: number[];
  x: number[];
  y: number[];
  p: number[];
  d: number[];
  vx: number[];
  vy: number[];
  ax: number[];
  ay: number[];
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const inverseLerp = (a: number, b: number, v: number) => (a === b ? 0 : (v - a) / (b - a));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const length = (x: number, y: number) => Math.sqrt(x * x + y * y);

// Ink's sliding window model: trapezoid time averages over the window, upsampled to 180 Hz.
function model(raw: Raw): Modeled {
  const m: Modeled = { t: [], x: [], y: [], p: [], d: [], vx: [], vy: [], ax: [], ay: [] };
  const count = raw.t.length;
  const channels = [raw.x, raw.y, raw.t, raw.p];
  const time = (i: number) => raw.t[i] as number;
  const value = (i: number, channel: number) => (channels[channel] as Float64Array)[i] as number;
  const firstTime = time(0);
  const lastTime = time(count - 1);
  let start = 0;
  let end = 0;
  const push = (t: number, x: number, y: number, p: number) => {
    const n = m.t.length;
    const step = n > 0 ? length(x - (m.x[n - 1] as number), y - (m.y[n - 1] as number)) : 0;
    if (n > 0 && step <= EPSILON) return;
    m.t.push(t);
    m.x.push(x);
    m.y.push(y);
    m.p.push(p);
    m.d.push(n > 0 ? (m.d[n - 1] as number) + step : 0);
  };
  // Integral over [from, to] of one channel, linear between raw points.
  const integral = (channel: number, from: number, to: number) => {
    let sum = 0;
    for (let i = start; i < end; i++) {
      const ta = time(i);
      const tb = time(i + 1);
      const a = value(i, channel);
      const b = value(i + 1, channel);
      const va = ta < from ? lerp(a, b, inverseLerp(ta, tb, from)) : a;
      const vb = tb > to ? lerp(a, b, inverseLerp(ta, tb, to)) : b;
      sum += (Math.min(tb, to) - Math.max(ta, from)) * 0.5 * (va + vb);
    }
    return sum;
  };
  const modelAt = (at: number) => {
    const half = Math.min(HALF_WINDOW, at - firstTime, lastTime - at);
    const from = at - half;
    const to = at + half;
    while (start + 1 < count && time(start + 1) <= from) start++;
    while (end + 1 < count && time(end) <= to) end++;
    const span = to - from;
    if (span <= 0) {
      push(time(start), value(start, 0), value(start, 1), value(start, 3));
      return;
    }
    const x = integral(0, from, to) / span;
    const y = integral(1, from, to) / span;
    push(at, x, y, integral(3, from, to) / span);
  };
  let previous = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < count; i++) {
    const t = time(i);
    if (t <= previous) continue;
    if (Number.isFinite(previous)) {
      const gap = t - previous;
      const divisions = Math.min(Math.ceil(gap / UPSAMPLE_PERIOD), MAX_DIVISIONS);
      for (let k = 1; k < divisions; k++) modelAt(previous + (gap / divisions) * k);
    }
    modelAt(t);
    previous = t;
  }
  derive(m.t, m.x, m.y, m.vx, m.vy);
  derive(m.t, m.vx, m.vy, m.ax, m.ay);
  return m;
}

// Average rate of change over the window around each point, clamped to the stroke.
function derive(t: number[], vx: number[], vy: number[], outX: number[], outY: number[]) {
  const count = t.length;
  const front = t[0] as number;
  const back = t[count - 1] as number;
  let start = 0;
  let end = 0;
  for (let i = 0; i < count; i++) {
    const at = t[i] as number;
    const from = Math.max(at - HALF_WINDOW, front);
    const to = Math.min(at + HALF_WINDOW, back);
    const span = to - from;
    if (span === 0) {
      outX.push(0);
      outY.push(0);
      continue;
    }
    while (start + 1 < count && (t[start + 1] as number) <= from) start++;
    while (end + 1 < count && (t[end] as number) <= to) end++;
    let sx = vx[start] as number;
    let sy = vy[start] as number;
    if (start + 1 < count) {
      const r = inverseLerp(t[start] as number, t[start + 1] as number, from);
      sx = lerp(sx, vx[start + 1] as number, r);
      sy = lerp(sy, vy[start + 1] as number, r);
    }
    let ex = vx[end] as number;
    let ey = vy[end] as number;
    if (end > 0) {
      const r = inverseLerp(t[end - 1] as number, t[end] as number, to);
      ex = lerp(vx[end - 1] as number, ex, r);
      ey = lerp(vy[end - 1] as number, ey, r);
    }
    outX.push((ex - sx) / span);
    outY.push((ey - sy) / span);
  }
}

const bezier = (t: number, p1: number, p2: number) =>
  3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;

// CSS ease-out, cubic-bezier(0, 0, 0.58, 1), solved for x by bisection.
function easeOut(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bezier(mid, 0, 0.58) < x) lo = mid;
    else hi = mid;
  }
  return bezier((lo + hi) / 2, 0, 1);
}

function sourceValue(
  source: Source,
  m: Modeled,
  i: number,
  size: number,
  unitLengthCm: number,
  hasPressure: boolean,
): number | null {
  const last = m.t.length - 1;
  switch (source) {
    case 'remaining':
      return ((m.d[last] as number) - (m.d[i] as number)) / size;
    case 'directionY': {
      const before = Math.max(0, i - 1);
      const after = Math.min(last, i + 1);
      const dx = (m.x[after] as number) - (m.x[before] as number);
      const dy = (m.y[after] as number) - (m.y[before] as number);
      return dx === 0 && dy === 0 ? null : dy / length(dx, dy);
    }
    case 'lateral': {
      const direction = Math.atan2(m.vy[i] as number, m.vx[i] as number);
      const ax = m.ax[i] as number;
      const ay = m.ay[i] as number;
      return (ax * -Math.sin(direction) + ay * Math.cos(direction)) * unitLengthCm;
    }
    case 'pressure':
      return hasPressure ? (m.p[i] as number) : null;
    case 'speed':
      return length(m.vx[i] as number, m.vy[i] as number) * unitLengthCm;
  }
}

// Width at each raw point, the way androidx.ink sizes inkpad's pen.
export function penWidths(
  points: readonly number[],
  size: number,
  input: InputType,
  unitLengthCm = UNIT_LENGTH_CM,
): number[] {
  const stride = POINT_STRIDE;
  const count = Math.floor(points.length / stride);
  if (count === 0) return [];
  const raw: Raw = {
    t: new Float64Array(count),
    x: new Float64Array(count),
    y: new Float64Array(count),
    p: new Float64Array(count),
  };
  for (let i = 0; i < count; i++) {
    raw.x[i] = points[i * stride] as number;
    raw.y[i] = points[i * stride + 1] as number;
    raw.t[i] = (points[i * stride + 2] as number) / 1000;
    raw.p[i] = points[i * stride + 3] as number;
  }
  const brushSize = clamp(size, MIN_SIZE, MAX_SIZE);
  const hasPressure = (raw.p[0] as number) >= 0;
  const m = model(raw);
  const behaviors = BEHAVIORS.filter((b) => !b.tools || b.tools.includes(input));
  const damped: (number | null)[] = behaviors.map(() => null);
  const multipliers = behaviors.map(() => 1);
  const widths: number[] = [];
  for (let i = 0; i < m.t.length; i++) {
    const dt = i > 0 ? (m.t[i] as number) - (m.t[i - 1] as number) : 0;
    let product = 1;
    for (let b = 0; b < behaviors.length; b++) {
      const behavior = behaviors[b] as Behavior;
      const value = sourceValue(behavior.source, m, i, brushSize, unitLengthCm, hasPressure);
      if (value !== null) {
        let normalized = clamp(inverseLerp(behavior.start, behavior.end, value), 0, 1);
        if (behavior.easeOut) normalized = easeOut(normalized);
        const previous = damped[b] as number | null;
        if (previous === null || behavior.gap === 0) damped[b] = normalized;
        else if (dt > 0) damped[b] = lerp(normalized, previous, Math.exp(-dt / behavior.gap));
      }
      const current = damped[b] as number | null;
      if (current !== null) multipliers[b] = lerp(behavior.from, behavior.to, current);
      product *= multipliers[b] as number;
    }
    widths.push(brushSize * clamp(product, 0, MAX_MULTIPLIER));
  }
  const out: number[] = [];
  let j = 0;
  for (let i = 0; i < count; i++) {
    const t = raw.t[i] as number;
    while (j + 1 < m.t.length && (m.t[j + 1] as number) <= t) j++;
    out.push(widths[j] as number);
  }
  return out;
}
