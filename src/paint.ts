import { hexToRgba } from './color';
import type { InkBrush } from './document';

export const HIGHLIGHTER_ALPHA = 0.4;

export type StrokePaint = { r: number; g: number; b: number; alpha: number; multiply: boolean };

export function strokePaint(brush: InkBrush): StrokePaint {
  const { r, g, b, a } = hexToRgba(brush.color);
  const highlighter = brush.type === 'highlighter';
  return { r, g, b, alpha: highlighter && a === 1 ? HIGHLIGHTER_ALPHA : a, multiply: highlighter };
}
