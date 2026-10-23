import { hexToRgba } from '../color';
import type { InkStroke } from '../document';
import { type BackgroundFit, fitRect, type Size } from '../geometry/fit';
import { nibFor } from '../geometry/nib';
import { cachedWidthPoints, outlinePath, type WidthPoint, widthPoints } from '../geometry/outline';
import { strokePaint } from '../paint';
import type { ImageLike } from './backgroundImage';

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

function fillStroke(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  widths: readonly WidthPoint[],
  makePath: MakePath,
): void {
  const { r, g, b, alpha, multiply } = strokePaint(stroke.brush);
  ctx.save();
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = multiply ? 'multiply' : 'source-over';
  ctx.fill(makePath(outlinePath(widths, nibFor(stroke))));
  ctx.restore();
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  makePath: MakePath = newPath,
): void {
  fillStroke(ctx, stroke, widthPoints(stroke), makePath);
}

export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: readonly InkStroke[],
  makePath: MakePath = newPath,
): void {
  for (const stroke of strokes) fillStroke(ctx, stroke, cachedWidthPoints(stroke), makePath);
}

export function drawBackgroundImage(
  ctx: CanvasRenderingContext2D,
  image: ImageLike | null,
  size: Size,
  fit: BackgroundFit,
): void {
  if (!image) return;
  const rect = fitRect({ width: image.naturalWidth, height: image.naturalHeight }, size, fit);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, size.width, size.height);
  ctx.clip();
  ctx.drawImage(image as unknown as CanvasImageSource, rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}
