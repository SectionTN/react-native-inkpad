import { describe, expect, it } from 'vitest';
import { toNativeInkProps } from '../nativeProps';

describe('toNativeInkProps', () => {
  it('fills in the defaults', () => {
    expect(toNativeInkProps({})).toEqual({
      brushType: 'pen',
      brushColor: '#000000',
      brushSize: 3,
      tool: 'draw',
      editable: true,
      canvasColor: undefined,
    });
  });

  it('passes given values through', () => {
    expect(
      toNativeInkProps({
        brush: { type: 'marker', color: 'red', size: 8 },
        tool: 'erase',
        editable: false,
        background: { color: '#ffffff' },
      }),
    ).toEqual({
      brushType: 'marker',
      brushColor: 'red',
      brushSize: 8,
      tool: 'erase',
      editable: false,
      canvasColor: '#ffffff',
    });
  });
});
