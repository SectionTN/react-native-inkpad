import { hexToRgba } from '../color';
import type { InkDocument } from '../document';
import { ErrorCode, InkpadError } from '../errors';
import { boundsOf } from '../geometry/bounds';
import type { BackgroundFit } from '../geometry/fit';
import { fmt, outlinePath, widthPoints } from '../geometry/outline';
import { strokePaint } from '../paint';
import type { Trim } from '../types';

export type SvgRenderOptions = {
  trim?: Trim;
  backgroundColor?: string;
  backgroundImage?: { uri: string; fit: BackgroundFit };
};

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
  const image = options.backgroundImage;
  if (image && HAS_SCHEME.test(image.uri)) {
    const aspect = image.fit === 'cover' ? 'slice' : 'meet';
    body.push(
      `<image href="${escapeXml(image.uri)}" x="0" y="0" width="${fmt(doc.size.width)}" height="${fmt(doc.size.height)}" preserveAspectRatio="xMidYMid ${aspect}"/>`,
    );
  }
  for (const { stroke, points } of strokes) {
    const { r, g, b, alpha, multiply } = strokePaint(stroke.brush);
    const blend = multiply ? ' style="mix-blend-mode:multiply"' : '';
    body.push(
      `<path d="${outlinePath(points)}" fill="rgb(${r},${g},${b})" fill-opacity="${fmt(alpha)}"${blend}/>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}" height="${fmt(height)}" viewBox="${fmt(x)} ${fmt(y)} ${fmt(width)} ${fmt(height)}">${body.join('')}</svg>`;
}
