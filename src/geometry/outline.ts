import { type InkStroke, POINT_STRIDE } from '../document';
import type { Nib } from './nib';
import { penWidths } from './penModel';

export type Vec = { x: number; y: number };
export type WidthPoint = Vec & { w: number };

const MIN_GAP = 0.5;

// Pen widths follow the Android pen; marker and highlighter keep the brush size.
export function widthPoints(stroke: InkStroke): WidthPoint[] {
  const { brush, input, points } = stroke;
  const widths = brush.type === 'pen' ? penWidths(points, brush.size, input) : null;
  const out: WidthPoint[] = [];
  for (let i = 0; i < points.length; i += POINT_STRIDE) {
    const x = points[i] as number;
    const y = points[i + 1] as number;
    const previous = out[out.length - 1];
    if (previous && Math.hypot(x - previous.x, y - previous.y) < MIN_GAP) continue;
    out.push({ x, y, w: widths ? (widths[i / POINT_STRIDE] as number) : brush.size });
  }
  return out;
}

const widthCache = new WeakMap<InkStroke, WidthPoint[]>();

// Finished strokes never change, so redraws and the eraser reuse their widths.
export function cachedWidthPoints(stroke: InkStroke): WidthPoint[] {
  let widths = widthCache.get(stroke);
  if (!widths) {
    widths = widthPoints(stroke);
    widthCache.set(stroke, widths);
  }
  return widths;
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

const CAP_STEPS = 12;

// Half a turn of tip boundary around `p`, from direction `from` (radians) toward smaller angles.
function cap(p: Vec, from: number, nib: Nib, steps = CAP_STEPS): string {
  const parts: string[] = [];
  for (let k = 0; k <= steps; k++) {
    const angle = from - (Math.PI * k) / CAP_STEPS;
    const offset = nib(Math.cos(angle), Math.sin(angle));
    parts.push(`L ${fmt(p.x + offset.x)} ${fmt(p.y + offset.y)}`);
  }
  return parts.join(' ');
}

// A nib sweeps a non-round tip; without one the tip is a circle of each point's width.
export function outlinePath(points: readonly WidthPoint[], nib?: Nib): string {
  const first = points[0];
  if (!first) return '';
  if (nib) return nibPath(points, nib);
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

function nibPath(points: readonly WidthPoint[], nib: Nib): string {
  const first = points[0] as WidthPoint;
  if (points.length === 1) {
    return `M ${cap(first, 0, nib, CAP_STEPS * 2).slice(2)} Z`;
  }
  const left: Vec[] = [];
  const right: Vec[] = [];
  const angles: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i] as WidthPoint;
    const before = points[Math.max(0, i - 1)] as WidthPoint;
    const after = points[Math.min(points.length - 1, i + 1)] as WidthPoint;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const ahead = nib(nx, ny);
    const behind = nib(-nx, -ny);
    left.push({ x: point.x + ahead.x, y: point.y + ahead.y });
    right.push({ x: point.x + behind.x, y: point.y + behind.y });
    angles.push(Math.atan2(ny, nx));
  }
  const last = points[points.length - 1] as WidthPoint;
  const start = left[0] as Vec;
  return [
    `M ${fmt(start.x)} ${fmt(start.y)}`,
    smooth(left),
    cap(last, angles[angles.length - 1] as number, nib),
    smooth([...right].reverse()),
    cap(first, (angles[0] as number) - Math.PI, nib),
    'Z',
  ].join(' ');
}
