import { Image, type ImageSourcePropType } from 'react-native';

export function resolveImage(source: ImageSourcePropType): string | undefined {
  return Image.resolveAssetSource(source)?.uri;
}
