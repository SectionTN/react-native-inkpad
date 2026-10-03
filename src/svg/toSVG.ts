import { hexToRgba } from '../color';
import type { InkDocument } from '../document';
import { ErrorCode, InkpadError } from '../errors';
import { fmt, outlinePath, type WidthPoint, widthPoints } from '../geometry/outline';
import type { Trim } from '../types';

export type SvgRenderOptions = { trim?: Trim; backgroundColor?: string };

const HIGHLIGHTER_ALPHA = 0.4;

function boundsOf(points: readonly WidthPoint[]) {
  if (points.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    const r = p.w / 2;
    minX = Math.min(minX, p.x - r);
    minY = Math.min(minY, p.y - r);
    maxX = Math.max(maxX, p.x + r);
    maxY = Math.max(maxY, p.y + r);
  }
  return { minX, minY, maxX, maxY };
}

export function toSVG(doc: InkDocument, options: SvgRenderOptions = {}): string {
  const strokes = doc.strokes.map((stroke) => ({ stroke, points: widthPoints(stroke) }));
  let x = 0;
  let y = 0;
  let width = doc.size.width;
  let height = doc.size.height;
  if (options.trim) {
    const bounds = boundsOf(strokes.flatMap((s) => s.points));
    if (!bounds) throw new InkpadError(ErrorCode.EMPTY, 'nothing to trim: the canvas is empty');
    const padding = typeof options.trim === 'object' ? options.trim.padding : 0;
    x = bounds.minX - padding;
    y = bounds.minY - padding;
    width = bounds.maxX - bounds.minX + padding * 2;
    height = bounds.maxY - bounds.minY + padding * 2;
  }
  const body: string[] = [];
  if (options.backgroundColor) {
    const { r, g, b, a } = hexToRgba(options.backgroundColor);
    if (a > 0) {
      body.push(
        `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(width)}" height="${fmt(height)}" fill="rgb(${r},${g},${b})" fill-opacity="${fmt(a)}"/>`,
      );
    }
  }
  for (const { stroke, points } of strokes) {
    const { r, g, b, a } = hexToRgba(stroke.brush.color);
    const highlighter = stroke.brush.type === 'highlighter';
    const opacity = highlighter && a === 1 ? HIGHLIGHTER_ALPHA : a;
    const blend = highlighter ? ' style="mix-blend-mode:multiply"' : '';
    body.push(
      `<path d="${outlinePath(points)}" fill="rgb(${r},${g},${b})" fill-opacity="${fmt(opacity)}"${blend}/>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}" height="${fmt(height)}" viewBox="${fmt(x)} ${fmt(y)} ${fmt(width)} ${fmt(height)}">${body.join('')}</svg>`;
}
