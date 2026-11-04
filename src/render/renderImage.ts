import { PixelRatio } from 'react-native';
import type { InkDocument } from '../document';
import NativeInkpad from '../specs/NativeInkpad';
import type { ImageResult, RenderImageOptions } from '../types';
import { nativeRender, renderImageWith } from './imageCore';
import { appResolvers } from './resolvers';

const render = nativeRender(NativeInkpad ?? null);

/** Renders a stored document to an image without mounting a canvas. */
export function renderImage(doc: InkDocument, options?: RenderImageOptions): Promise<ImageResult> {
  return renderImageWith(doc, options, appResolvers, { defaultScale: PixelRatio.get(), render });
}
