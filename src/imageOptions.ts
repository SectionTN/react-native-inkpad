import type { BackgroundFit, ImageOptions } from './types';

export type NativeImageOptions = {
  format: 'png' | 'jpeg';
  quality: number;
  scale: number;
  trim: boolean;
  padding: number;
  background: boolean;
  base64: boolean;
};

export function toNativeImageOptions(
  options: ImageOptions,
  defaultScale: number,
): NativeImageOptions {
  const trim = options.trim ?? false;
  return {
    format: options.format ?? 'png',
    quality: Math.min(1, Math.max(0, options.quality ?? 0.9)),
    scale: options.scale !== undefined && options.scale > 0 ? options.scale : defaultScale,
    trim: trim !== false,
    padding: typeof trim === 'object' ? Math.max(0, trim.padding) : 0,
    background: options.background ?? true,
    base64: options.base64 ?? false,
  };
}

// Android runs view commands before pending prop updates, so the export carries the image it expects.
export function withBackgroundImage(
  options: NativeImageOptions,
  uri: string | undefined,
  fit: BackgroundFit,
): NativeImageOptions & { backgroundImageUri: string; backgroundFit: BackgroundFit } {
  return { ...options, backgroundImageUri: uri ?? '', backgroundFit: fit };
}
