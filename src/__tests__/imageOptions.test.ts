import { describe, expect, it } from 'vitest';
import { toNativeImageOptions } from '../imageOptions';

describe('toNativeImageOptions', () => {
  it('fills in the defaults', () => {
    expect(toNativeImageOptions({}, 3)).toEqual({
      format: 'png',
      quality: 0.9,
      scale: 3,
      trim: false,
      padding: 0,
      background: true,
      base64: false,
    });
  });

  it('reads trim padding and clamps quality', () => {
    expect(
      toNativeImageOptions(
        {
          format: 'jpeg',
          quality: 2,
          scale: 2,
          trim: { padding: 8 },
          background: false,
          base64: true,
        },
        3,
      ),
    ).toEqual({
      format: 'jpeg',
      quality: 1,
      scale: 2,
      trim: true,
      padding: 8,
      background: false,
      base64: true,
    });
  });

  it('falls back to the device scale when the scale is not positive', () => {
    expect(toNativeImageOptions({ scale: 0 }, 2).scale).toBe(2);
  });
});
