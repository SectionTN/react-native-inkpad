import type { InkDocument } from '../document';
import type { RenderSVGOptions } from '../types';
import { renderSvgWith } from './core';
import { appResolvers } from './resolvers';

/** Renders a stored document to an SVG string without mounting a canvas. */
export function renderSVG(doc: InkDocument, options?: RenderSVGOptions): string {
  return renderSvgWith(doc, options, appResolvers);
}
