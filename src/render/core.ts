import { validateDocument } from '../document';
import { ErrorCode, InkpadError } from '../errors';
import type { BackgroundFit } from '../geometry/fit';
import { toSVG } from '../svg/toSVG';
import type { Trim } from '../trim';

export type BackgroundInput<C, I> = { color?: C; image?: I | readonly I[]; fit?: BackgroundFit };

export type BackgroundResolvers<C, I> = {
  /** Returns `#RRGGBBAA`, or `undefined` for a color it can't read. */
  color(value: C): string | undefined;
  image(source: I): string | undefined;
};

export type ResolvedBackground = {
  color: string | undefined;
  uri: string | undefined;
  fit: BackgroundFit;
};

export function resolveBackground<C, I>(
  background: BackgroundInput<C, I> | undefined,
  resolvers: BackgroundResolvers<C, I>,
): ResolvedBackground {
  const fit = background?.fit ?? 'contain';
  const color = background?.color != null ? resolvers.color(background.color) : undefined;
  const image = background?.image;
  if (image == null) return { color, uri: undefined, fit };
  const source = Array.isArray(image) ? image[0] : (image as I);
  const uri = source != null ? resolvers.image(source) : undefined;
  if (!uri) throw new InkpadError(ErrorCode.IMAGE_LOAD, 'background.image has no usable URI');
  return { color, uri, fit };
}

export function renderSvgWith<C, I>(
  doc: unknown,
  options: { trim?: Trim; background?: BackgroundInput<C, I> } | undefined,
  resolvers: BackgroundResolvers<C, I>,
): string {
  const valid = validateDocument(doc);
  const { color, uri, fit } = resolveBackground(options?.background, resolvers);
  return toSVG(valid, {
    trim: options?.trim,
    backgroundColor: color,
    backgroundImage: uri ? { uri, fit } : undefined,
  });
}
