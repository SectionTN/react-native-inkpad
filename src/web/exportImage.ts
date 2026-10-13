import type { InkDocument } from '../document';
import { ErrorCode, InkpadError } from '../errors';
import { boundsOf } from '../geometry/bounds';
import { widthPoints } from '../geometry/outline';
import type { NativeImageOptions } from '../imageOptions';
import type { ImageResult } from '../types';
import { drawBackground, drawStrokes, type MakePath } from './render';

export type ExportArea = {
  x: number;
  y: number;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
};

export type ExportCanvas = {
  width: number;
  height: number;
  getContext(type: '2d'): CanvasRenderingContext2D | null;
  toBlob(callback: (blob: Blob | null) => void, type: string, quality?: number): void;
  toDataURL(type: string, quality?: number): string;
};

export type ExportDeps = {
  createCanvas(): ExportCanvas;
  createObjectURL(blob: Blob): string;
  makePath?: MakePath;
};

const pixels = (units: number, scale: number) => Math.max(1, Math.round(units * scale));

export function exportArea(doc: InkDocument, options: NativeImageOptions): ExportArea {
  let x = 0;
  let y = 0;
  let { width, height } = doc.size;
  if (options.trim) {
    const bounds = boundsOf(doc.strokes.flatMap(widthPoints));
    if (!bounds) throw new InkpadError(ErrorCode.EMPTY, 'nothing to trim: the canvas is empty');
    x = bounds.minX - options.padding;
    y = bounds.minY - options.padding;
    width = bounds.maxX - bounds.minX + options.padding * 2;
    height = bounds.maxY - bounds.minY + options.padding * 2;
  }
  return {
    x,
    y,
    width,
    height,
    pixelWidth: pixels(width, options.scale),
    pixelHeight: pixels(height, options.scale),
  };
}

export async function exportImage(
  doc: InkDocument,
  options: NativeImageOptions,
  backgroundColor: string | undefined,
  deps: ExportDeps,
): Promise<ImageResult> {
  const area = exportArea(doc, options);
  const canvas = deps.createCanvas();
  canvas.width = area.pixelWidth;
  canvas.height = area.pixelHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new InkpadError(ErrorCode.EXPORT_FAILED, 'the browser has no 2D canvas');
  if (options.format === 'jpeg')
    drawBackground(ctx, '#FFFFFFFF', area.pixelWidth, area.pixelHeight);
  if (options.background) drawBackground(ctx, backgroundColor, area.pixelWidth, area.pixelHeight);
  const { scale } = options;
  ctx.setTransform(scale, 0, 0, scale, -area.x * scale, -area.y * scale);
  drawStrokes(ctx, doc.strokes, deps.makePath);
  const type = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = options.format === 'jpeg' ? options.quality : undefined;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob)
    throw new InkpadError(ErrorCode.EXPORT_FAILED, 'the browser could not encode the image');
  const result: ImageResult = {
    uri: deps.createObjectURL(blob),
    width: area.pixelWidth,
    height: area.pixelHeight,
  };
  if (options.base64) {
    const dataUrl = canvas.toDataURL(type, quality);
    result.base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  }
  return result;
}
