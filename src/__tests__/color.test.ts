import { describe, expect, it } from 'vitest';
import { argbToHex, hexToRgba } from '../color';

describe('color', () => {
  it('turns an ARGB int into #RRGGBBAA', () => {
    expect(argbToHex(0xff112233)).toBe('#112233FF');
    expect(argbToHex(-16777216)).toBe('#000000FF');
    expect(argbToHex(0x80ffffff)).toBe('#FFFFFF80');
  });

  it('splits #RRGGBBAA into channels', () => {
    expect(hexToRgba('#11223380')).toEqual({ r: 17, g: 34, b: 51, a: 128 / 255 });
  });
});
