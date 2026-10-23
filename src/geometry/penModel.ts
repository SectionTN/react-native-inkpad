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

type Raw = { t: number; x: number; y: number; p: number };

type Modeled = {
  t: number;
  x: number;
  y: number;
  p: number;
  d: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const inverseLerp = (a: number, b: number, v: number) => (a === b ? 0 : (v - a) / (b - a));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function interpolate(a: Raw, b: Raw, t: number): Raw {
  const r = inverseLerp(a.t, b.t, t);
  return { t, x: lerp(a.x, b.x, r), y: lerp(a.y, b.y, r), p: lerp(a.p, b.p, r) };
}

// Ink's sliding window model: trapezoid time averages over the window, upsampled to 180 Hz.
function model(raw: readonly Raw[]): Modeled[] {
  const out: Modeled[] = [];
  const first = raw[0] as Raw;
  const last = raw[raw.length - 1] as Raw;
  let start = 0;
  let end = 0;
  const push = (t: number, x: number, y: number, p: number) => {
    const previous = out[out.length - 1];
    const step = previous ? Math.hypot(x - previous.x, y - previous.y) : 0;
    if (previous && step <= EPSILON) return;
    out.push({ t, x, y, p, d: (previous?.d ?? 0) + step, vx: 0, vy: 0, ax: 0, ay: 0 });
  };
  const modelAt = (time: number) => {
    const half = Math.min(HALF_WINDOW, time - first.t, last.t - time);
    const from = time - half;
    const to = time + half;
    while (start + 1 < raw.length && (raw[start + 1] as Raw).t <= from) start++;
    while (end + 1 < raw.length && (raw[end] as Raw).t <= to) end++;
    const span = to - from;
    if (span <= 0) {
      const input = raw[start] as Raw;
      push(input.t, input.x, input.y, input.p);
      return;
    }
    let x = 0;
    let y = 0;
    let p = 0;
    for (let i = start; i < end; i++) {
      let a = raw[i] as Raw;
      let b = raw[i + 1] as Raw;
      if (a.t < from) a = interpolate(a, b, from);
      if (b.t > to) b = interpolate(a, b, to);
      const dt = b.t - a.t;
      x += dt * 0.5 * (a.x + b.x);
      y += dt * 0.5 * (a.y + b.y);
      p += dt * 0.5 * (a.p + b.p);
    }
    push(time, x / span, y / span, p / span);
  };
  let previous = Number.NEGATIVE_INFINITY;
  for (const input of raw) {
    if (input.t <= previous) continue;
    if (Number.isFinite(previous)) {
      const gap = input.t - previous;
      const divisions = Math.min(Math.ceil(gap / UPSAMPLE_PERIOD), MAX_DIVISIONS);
      for (let i = 1; i < divisions; i++) modelAt(previous + (gap / divisions) * i);
    }
    modelAt(input.t);
    previous = input.t;
  }
  derive(
    out,
    (m) => [m.x, m.y],
    (m, x, y) => Object.assign(m, { vx: x, vy: y }),
  );
  derive(
    out,
    (m) => [m.vx, m.vy],
    (m, x, y) => Object.assign(m, { ax: x, ay: y }),
  );
  return out;
}

// Average rate of change over the window around each point, clamped to the stroke.
function derive(
  points: Modeled[],
  value: (m: Modeled) => [number, number],
  write: (m: Modeled, x: number, y: number) => void,
) {
  const count = points.length;
  const front = (points[0] as Modeled).t;
  const back = (points[count - 1] as Modeled).t;
  const at = (i: number, j: number, t: number): [number, number] => {
    const a = points[i] as Modeled;
    const b = points[j] as Modeled;
    const r = inverseLerp(a.t, b.t, t);
    const [ax, ay] = value(a);
    const [bx, by] = value(b);
    return [lerp(ax, bx, r), lerp(ay, by, r)];
  };
  const results: [number, number][] = [];
  let start = 0;
  let end = 0;
  for (const point of points) {
    const from = Math.max(point.t - HALF_WINDOW, front);
    const to = Math.min(point.t + HALF_WINDOW, back);
    const span = to - from;
    if (span === 0) {
      results.push([0, 0]);
      continue;
    }
    while (start + 1 < count && (points[start + 1] as Modeled).t <= from) start++;
    while (end + 1 < count && (points[end] as Modeled).t <= to) end++;
    const [sx, sy] =
      start + 1 < count ? at(start, start + 1, from) : value(points[start] as Modeled);
    const [ex, ey] = end > 0 ? at(end - 1, end, to) : value(points[end] as Modeled);
    results.push([(ex - sx) / span, (ey - sy) / span]);
  }
  points.forEach((point, i) => {
    const [x, y] = results[i] as [number, number];
    write(point, x, y);
  });
}

// CSS ease-out, cubic-bezier(0, 0, 0.58, 1), solved for x by bisection.
function easeOut(x: number): number {
  const bezier = (t: number, p1: number, p2: number) =>
    3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (bezier(mid, 0, 0.58) < x) lo = mid;
    else hi = mid;
  }
  return bezier((lo + hi) / 2, 0, 1);
}

function sourceValue(
  source: Source,
  points: readonly Modeled[],
  i: number,
  size: number,
  unitLengthCm: number,
  hasPressure: boolean,
): number | null {
  const point = points[i] as Modeled;
  switch (source) {
    case 'remaining':
      return ((points[points.length - 1] as Modeled).d - point.d) / size;
    case 'directionY': {
      const before = points[Math.max(0, i - 1)] as Modeled;
      const after = points[Math.min(points.length - 1, i + 1)] as Modeled;
      const dx = after.x - before.x;
      const dy = after.y - before.y;
      return dx === 0 && dy === 0 ? null : dy / Math.hypot(dx, dy);
    }
    case 'lateral': {
      const direction = Math.atan2(point.vy, point.vx);
      return (point.ax * -Math.sin(direction) + point.ay * Math.cos(direction)) * unitLengthCm;
    }
    case 'pressure':
      return hasPressure ? point.p : null;
    case 'speed':
      return Math.hypot(point.vx, point.vy) * unitLengthCm;
  }
}

// Width at each raw point, the way androidx.ink sizes inkpad's pen.
export function penWidths(
  points: readonly number[],
  size: number,
  input: InputType,
  unitLengthCm = UNIT_LENGTH_CM,
): number[] {
  const raw: Raw[] = [];
  for (let i = 0; i < points.length; i += POINT_STRIDE) {
    raw.push({
      t: (points[i + 2] as number) / 1000,
      x: points[i] as number,
      y: points[i + 1] as number,
      p: points[i + 3] as number,
    });
  }
  if (raw.length === 0) return [];
  const brushSize = clamp(size, MIN_SIZE, MAX_SIZE);
  const hasPressure = (raw[0] as Raw).p >= 0;
  const modeled = model(raw);
  const damped: (number | null)[] = BEHAVIORS.map(() => null);
  const multipliers = BEHAVIORS.map(() => 1);
  const widths = modeled.map((point, i) => {
    BEHAVIORS.forEach((behavior, b) => {
      const enabled = !behavior.tools || behavior.tools.includes(input);
      const value = enabled
        ? sourceValue(behavior.source, modeled, i, brushSize, unitLengthCm, hasPressure)
        : null;
      if (value !== null) {
        let normalized = clamp(inverseLerp(behavior.start, behavior.end, value), 0, 1);
        if (behavior.easeOut) normalized = easeOut(normalized);
        const previous = damped[b] ?? null;
        const dt = point.t - ((modeled[i - 1] as Modeled | undefined)?.t ?? point.t);
        damped[b] =
          previous === null || behavior.gap === 0
            ? normalized
            : dt <= 0
              ? previous
              : lerp(normalized, previous, Math.exp(-dt / behavior.gap));
      }
      const current = damped[b] ?? null;
      if (current !== null) multipliers[b] = lerp(behavior.from, behavior.to, current);
    });
    const product = multipliers.reduce((a, b) => a * b, 1);
    return brushSize * clamp(product, 0, MAX_MULTIPLIER);
  });
  const out: number[] = [];
  let j = 0;
  for (const input of raw) {
    while (j + 1 < modeled.length && (modeled[j + 1] as Modeled).t <= input.t) j++;
    out.push(widths[j] as number);
  }
  return out;
}
