import type { ImageSourcePropType } from 'react-native';
import { uriOf } from '../web/imageSource';

export function resolveImage(source: ImageSourcePropType): string | undefined {
  const uri = uriOf(source);
  return uri ? new URL(uri, document.baseURI).href : undefined;
}
