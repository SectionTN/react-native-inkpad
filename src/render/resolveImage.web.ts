import type { ImageSourcePropType } from 'react-native';
import { absoluteUri, uriOf } from '../web/imageSource';

export function resolveImage(source: ImageSourcePropType): string | undefined {
  const uri = uriOf(source);
  const base = typeof document === 'undefined' ? undefined : document.baseURI;
  return uri ? absoluteUri(uri, base) : undefined;
}
