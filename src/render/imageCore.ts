import { type InkDocument, validateDocument } from '../document';
import { ErrorCode, InkpadError, toInkpadError } from '../errors';
import { toNativeImageOptions, withBackground } from '../imageOptions';
import type { Spec } from '../specs/NativeInkpad';
import type { ImageOptions, ImageResult } from '../types';
import { type BackgroundInput, type BackgroundResolvers, resolveBackground } from './core';

export type NativeRenderOptions = ReturnType<typeof withBackground>;

export type RenderImageDeps = {
  defaultScale: number;
  render(doc: InkDocument, options: NativeRenderOptions): Promise<ImageResult>;
};

export async function renderImageWith<C, I>(
  doc: unknown,
  options: (Omit<ImageOptions, 'background'> & { background?: BackgroundInput<C, I> }) | undefined,
  resolvers: BackgroundResolvers<C, I>,
  deps: RenderImageDeps,
): Promise<ImageResult> {
  const valid = validateDocument(doc);
  const { background, ...rest } = options ?? {};
  const { color, uri, fit } = resolveBackground(background, resolvers);
  const native = toNativeImageOptions({ ...rest, background: true }, deps.defaultScale);
  return deps.render(valid, withBackground(native, { color, uri, fit }));
}

/** Starts each render after the previous one settles, as the native renderers do. */
export function oneAtATime(render: RenderImageDeps['render']): RenderImageDeps['render'] {
  let last: Promise<unknown> = Promise.resolve();
  return (doc, options) => {
    const next = last.then(() => render(doc, options));
    last = next.catch(() => {});
    return next;
  };
}

export function nativeRender(module: Pick<Spec, 'renderImage'> | null): RenderImageDeps['render'] {
  return async (doc, options) => {
    if (!module) {
      throw new InkpadError(
        ErrorCode.EXPORT_FAILED,
        'the react-native-inkpad native module is missing; rebuild the app',
      );
    }
    let payload: string;
    try {
      payload = await module.renderImage(JSON.stringify(doc), JSON.stringify(options));
    } catch (error) {
      const failure = error as { code?: unknown; message?: unknown } | null;
      throw toInkpadError(String(failure?.code), String(failure?.message ?? error));
    }
    return JSON.parse(payload) as ImageResult;
  };
}
