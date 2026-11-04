import type { InkDocument } from '../document';
import type { BackgroundFit } from '../geometry/fit';
import { renderSvgWith } from '../render/core';
import type { Trim } from '../trim';
import { cssColorToHex } from './cssColor';

export type ServerSVGOptions = {
  trim?: Trim;
  background?: { color?: string; image?: { uri: string }; fit?: BackgroundFit };
};

/** Renders a stored document to an SVG string in Node, with no React Native loaded. */
export function renderSVG(doc: InkDocument, options?: ServerSVGOptions): string {
  return renderSvgWith(doc, options, {
    color: cssColorToHex,
    image: (source) => source.uri,
  });
}

export type { InkBrush, InkDocument, InkStroke, InputType } from '../document';
export { validateDocument } from '../document';
export { ErrorCode, InkpadError } from '../errors';
export type { BackgroundFit } from '../geometry/fit';
export type { Trim } from '../trim';
