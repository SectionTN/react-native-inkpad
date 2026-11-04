import { type ColorValue, type ImageSourcePropType, processColor } from 'react-native';
import { argbToHex } from '../color';
import type { BackgroundResolvers } from './core';
import { resolveImage } from './resolveImage';

export const appResolvers: BackgroundResolvers<ColorValue, ImageSourcePropType> = {
  color(value) {
    const processed = processColor(value);
    return typeof processed === 'number' ? argbToHex(processed) : undefined;
  },
  image: resolveImage,
};
