import normalizeColor from '@react-native/normalize-colors';
import { ErrorCode, InkpadError } from '../errors';

/** Parses a CSS color into `#RRGGBBAA`. */
export function cssColorToHex(color: string): string {
  const value = normalizeColor(color);
  if (value == null) {
    throw new InkpadError(ErrorCode.EXPORT_FAILED, `background.color is not a CSS color: ${color}`);
  }
  return `#${(value >>> 0).toString(16).padStart(8, '0').toUpperCase()}`;
}
