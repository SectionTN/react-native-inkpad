import type { InkDocument } from '../document';
import type { InkpadError } from '../errors';
import type { NativeRenderOptions } from '../render/imageCore';
import type { ImageResult } from '../types';
import { BackgroundImage, type ImageLike } from './backgroundImage';
import { type ExportDeps, exportImage } from './exportImage';

export async function renderDocumentImage(
  doc: InkDocument,
  options: NativeRenderOptions,
  deps: ExportDeps & { createImage(): ImageLike },
): Promise<ImageResult> {
  let image: ImageLike | null = null;
  if (options.backgroundImageUri) {
    const failures: InkpadError[] = [];
    const loader = new BackgroundImage(
      deps.createImage,
      () => {},
      (error) => failures.push(error),
    );
    loader.set(options.backgroundImageUri);
    image = await loader.ready();
    if (failures[0]) throw failures[0];
  }
  return exportImage(
    doc,
    options,
    options.backgroundColor || undefined,
    deps,
    image ? { image, fit: options.backgroundFit } : undefined,
  );
}
