import { type InkStroke, POINT_STRIDE } from '../document';

export type Vec = { x: number; y: number };
export type WidthPoint = Vec & { w: number };

const MIN_GAP = 0.5;
const MIN_WIDTH_RATIO = 0.3;
const VELOCITY_FILTER = 0.7;

// A stylus pen follows pressure. Touch and mouse thin with speed, like signature_pad, since screens rarely report it.
export function widthPoints(stroke: InkStroke): WidthPoint[] {
  const { brush, input, points } = stroke;
  const out: WidthPoint[] = [];
  let velocity = 0;
  let lastTime = 0;
  for (let i = 0; i < points.length; i += POINT_STRIDE) {
    const x = points[i] as number;
    const y = points[i + 1] as number;
    const t = points[i + 2] as number;
    const pressure = points[i + 3] as number;
    const previous = out[out.length - 1];
    if (previous && Math.hypot(x - previous.x, y - previous.y) < MIN_GAP) continue;
    let w = brush.size;
    if (brush.type === 'pen') {
      if (input === 'stylus') {
        if (pressure >= 0) w = brush.size * (0.4 + 0.6 * pressure);
      } else if (previous) {
        const speed = Math.hypot(x - previous.x, y - previous.y) / Math.max(1, t - lastTime);
        velocity = VELOCITY_FILTER * speed + (1 - VELOCITY_FILTER) * velocity;
        w = Math.max(brush.size / (velocity + 1), brush.size * MIN_WIDTH_RATIO);
      }
    }
    out.push({ x, y, w });
    lastTime = t;
  }
  return out;
}

export function fmt(value: number): string {
  const text = value.toFixed(2).replace(/\.?0+$/, '');
  return text === '-0' ? '0' : text;
}

// Quadratic curves through the midpoints turn a polyline into a smooth edge.
function smooth(line: readonly Vec[]): string {
  const parts: string[] = [];
  for (let i = 1; i < line.length - 1; i++) {
    const point = line[i] as Vec;
    const next = line[i + 1] as Vec;
    parts.push(
      `Q ${fmt(point.x)} ${fmt(point.y)} ${fmt((point.x + next.x) / 2)} ${fmt((point.y + next.y) / 2)}`,
    );
  }
  const end = line[line.length - 1] as Vec;
  parts.push(`L ${fmt(end.x)} ${fmt(end.y)}`);
  return parts.join(' ');
}

export function outlinePath(points: readonly WidthPoint[]): string {
  const first = points[0];
  if (!first) return '';
  if (points.length === 1) {
    const r = first.w / 2;
    return `M ${fmt(first.x - r)} ${fmt(first.y)} a ${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(r * 2)} 0 a ${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(-r * 2)} 0 Z`;
  }
  const left: Vec[] = [];
  const right: Vec[] = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i] as WidthPoint;
    const before = points[Math.max(0, i - 1)] as WidthPoint;
    const after = points[Math.min(points.length - 1, i + 1)] as WidthPoint;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const r = point.w / 2;
    left.push({ x: point.x + nx * r, y: point.y + ny * r });
    right.push({ x: point.x - nx * r, y: point.y - ny * r });
  }
  const back = [...right].reverse();
  const start = left[0] as Vec;
  const turn = back[0] as Vec;
  const endRadius = (points[points.length - 1] as WidthPoint).w / 2;
  const startRadius = first.w / 2;
  return [
    `M ${fmt(start.x)} ${fmt(start.y)}`,
    smooth(left),
    `A ${fmt(endRadius)} ${fmt(endRadius)} 0 0 0 ${fmt(turn.x)} ${fmt(turn.y)}`,
    smooth(back),
    `A ${fmt(startRadius)} ${fmt(startRadius)} 0 0 0 ${fmt(start.x)} ${fmt(start.y)}`,
    'Z',
  ].join(' ');
}
