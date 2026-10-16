import { ErrorCode, InkpadError } from '../errors';

export function uriOf(source: unknown): string | undefined {
  if (typeof source === 'number') {
    throw new InkpadError(
      ErrorCode.IMAGE_LOAD,
      'numeric image assets are not supported on web; pass { uri }',
    );
  }
  const first = Array.isArray(source) ? source[0] : source;
  if (typeof first === 'string') return first || undefined;
  if (first && typeof first === 'object' && typeof (first as { uri?: unknown }).uri === 'string') {
    return (first as { uri: string }).uri || undefined;
  }
  return undefined;
}
