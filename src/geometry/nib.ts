import { type InkStroke, POINT_STRIDE } from '../document';
import type { Vec } from './outline';

// The point of a convex tip farthest along a unit direction, relative to the tip's center.
export type Nib = (nx: number, ny: number) => Vec;

// androidx.ink's stock highlighter tip: a 0.25 by 1 rounded rectangle turned 150 degrees.
const HIGHLIGHTER_SCALE_X = 0.25;
const HIGHLIGHTER_SCALE_Y = 1;
const HIGHLIGHTER_ROTATION = (150 * Math.PI) / 180;

export function highlighterNib(size: number, cornerRounding = 1): Nib {
  const a = (size * HIGHLIGHTER_SCALE_X) / 2;
  const b = (size * HIGHLIGHTER_SCALE_Y) / 2;
  const r = cornerRounding * Math.min(a, b);
  const cos = Math.cos(HIGHLIGHTER_ROTATION);
  const sin = Math.sin(HIGHLIGHTER_ROTATION);
  return (nx, ny) => {
    const cx = Math.sign(nx * cos + ny * sin) * (a - r);
    const cy = Math.sign(-nx * sin + ny * cos) * (b - r);
    return { x: cx * cos - cy * sin + r * nx, y: cx * sin + cy * cos + r * ny };
  };
}

export function crossSection(nib: Nib, nx: number, ny: number): number {
  const ahead = nib(nx, ny);
  const behind = nib(-nx, -ny);
  return (ahead.x - behind.x) * nx + (ahead.y - behind.y) * ny;
}

// Ink rounds the highlighter's corners toward both ends, fully once the stroke is a seventh of its size long.
export function nibFor(stroke: InkStroke): Nib | undefined {
  const { brush, points } = stroke;
  if (brush.type !== 'highlighter') return undefined;
  let length = 0;
  for (let i = POINT_STRIDE; i < points.length; i += POINT_STRIDE) {
    const dx = (points[i] as number) - (points[i - POINT_STRIDE] as number);
    const dy = (points[i + 1] as number) - (points[i + 1 - POINT_STRIDE] as number);
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return highlighterNib(brush.size, Math.min(1, 0.9 + (0.7 * length) / brush.size));
}
