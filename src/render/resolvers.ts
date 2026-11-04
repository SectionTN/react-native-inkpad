import { type ColorValue, type ImageSourcePropType, processColor } from 'react-native';
import { argbToHex } from '../color';
import type { BackgroundResolvers } from './core';
import { resolveImage } from './resolveImage';

export const appResolvers: BackgroundResolvers<ColorValue, ImageSourcePropType> = {
  color(value) {
    const processed = processColor(value);
    if (typeof processed === 'number') return argbToHex(processed);
    if (__DEV__) {
      console.warn(
        'react-native-inkpad: background.color has no concrete value, so the render leaves it out. Pass a concrete color (hex, rgb() or a named color).',
      );
    }
    return undefined;
  },
  image: resolveImage,
};
