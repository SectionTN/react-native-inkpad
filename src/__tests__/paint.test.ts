import { describe, expect, it } from 'vitest';
import { strokePaint } from '../paint';

describe('strokePaint', () => {
  it('draws an opaque highlighter at 40% with multiply', () => {
    expect(strokePaint({ type: 'highlighter', color: '#FFD60AFF', size: 20 })).toEqual({
      r: 255,
      g: 214,
      b: 10,
      alpha: 0.4,
      multiply: true,
    });
  });

  it('keeps a translucent highlighter color as given', () => {
    expect(strokePaint({ type: 'highlighter', color: '#FFD60A80', size: 20 }).alpha).toBeCloseTo(
      128 / 255,
    );
  });

  it('paints pens and markers without blending', () => {
    expect(strokePaint({ type: 'pen', color: '#FF000080', size: 3 }).multiply).toBe(false);
  });
});
