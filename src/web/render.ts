import { hexToRgba } from '../color';
import type { InkStroke } from '../document';
import { outlinePath, widthPoints } from '../geometry/outline';
import { strokePaint } from '../paint';

export type MakePath = (d: string) => Path2D;

const newPath: MakePath = (d) => new Path2D(d);

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  color: string | undefined,
  width: number,
  height: number,
): void {
  if (!color) return;
  const { r, g, b, a } = hexToRgba(color);
  if (a === 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  makePath: MakePath = newPath,
): void {
  const { r, g, b, alpha, multiply } = strokePaint(stroke.brush);
  ctx.save();
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = multiply ? 'multiply' : 'source-over';
  ctx.fill(makePath(outlinePath(widthPoints(stroke))));
  ctx.restore();
}

export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: readonly InkStroke[],
  makePath: MakePath = newPath,
): void {
  for (const stroke of strokes) drawStroke(ctx, stroke, makePath);
}
