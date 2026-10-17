import type { InkStroke } from '../document';
import { cachedWidthPoints, type Vec } from './outline';

export const ERASER_RADIUS = 10;

function pointToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function side(o: Vec, a: Vec, b: Vec): number {
  return Math.sign((a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x));
}

function segmentDistance(a: Vec, b: Vec, c: Vec, d: Vec): number {
  const crosses = side(c, d, a) * side(c, d, b) < 0 && side(a, b, c) * side(a, b, d) < 0;
  if (crosses) return 0;
  return Math.min(
    pointToSegment(a, c, d),
    pointToSegment(b, c, d),
    pointToSegment(c, a, b),
    pointToSegment(d, a, b),
  );
}

export function touches(stroke: InkStroke, from: Vec, to: Vec, radius = ERASER_RADIUS): boolean {
  const points = cachedWidthPoints(stroke);
  // Index 0 pairs the first point with itself, so a one-point stroke is a zero-length segment.
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[i];
    if (!a || !b) continue;
    if (segmentDistance(a, b, from, to) <= radius + Math.max(a.w, b.w) / 2) return true;
  }
  return false;
}
