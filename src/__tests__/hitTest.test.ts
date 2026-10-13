import { describe, expect, it } from 'vitest';
import type { InkStroke } from '../document';
import { touches } from '../geometry/hitTest';

const marker = (points: number[]): InkStroke => ({
  brush: { type: 'marker', color: '#000000FF', size: 4 },
  input: 'touch',
  points,
});
const line = marker([10, 10, 0, -1, -1, -1, 50, 10, 16, -1, -1, -1]);
const dot = marker([5, 5, 0, -1, -1, -1]);

describe('touches', () => {
  it('hits a stroke the eraser crosses', () => {
    expect(touches(line, { x: 30, y: -20 }, { x: 30, y: 40 })).toBe(true);
  });

  it('misses a stroke the eraser stays away from', () => {
    expect(touches(line, { x: 30, y: 30 }, { x: 40, y: 30 })).toBe(false);
  });

  it('counts the stroke width', () => {
    expect(touches(line, { x: 30, y: 21 }, { x: 30, y: 21 })).toBe(true);
    expect(touches(line, { x: 30, y: 23 }, { x: 30, y: 23 })).toBe(false);
  });

  it('hits a dot', () => {
    expect(touches(dot, { x: 5, y: 16 }, { x: 5, y: 16 })).toBe(true);
  });
});
