import type { InkDocument } from '../document';
import type { ImageResult, RenderImageOptions } from '../types';
import { renderDocumentImage } from '../web/renderDocument';
import { oneAtATime, renderImageWith } from './imageCore';
import { appResolvers } from './resolvers';

// One at a time, so a list of thumbnails holds one full-size canvas while toBlob is pending.
const render = oneAtATime((valid, native) =>
  renderDocumentImage(valid, native, {
    createCanvas: () => document.createElement('canvas'),
    createObjectURL: (blob) => URL.createObjectURL(blob),
    createImage: () => new Image(),
  }),
);

/** Renders a stored document to an image without mounting a canvas. */
export function renderImage(doc: InkDocument, options?: RenderImageOptions): Promise<ImageResult> {
  return renderImageWith(doc, options, appResolvers, {
    defaultScale: window.devicePixelRatio || 1,
    render,
  });
}
