import { describe, expect, it } from 'vitest';
import type { InkStroke } from '../document';
import { outlinePath, widthPoints } from '../geometry/outline';

const stroke = (type: 'pen' | 'marker', points: number[], size = 4): InkStroke => ({
  brush: { type, color: '#000000FF', size },
  input: 'touch',
  points,
});

describe('widthPoints', () => {
  it('keeps the brush size for a marker', () => {
    expect(widthPoints(stroke('marker', [10, 10, 0, -1, -1, -1, 50, 10, 16, -1, -1, -1]))).toEqual([
      { x: 10, y: 10, w: 4 },
      { x: 50, y: 10, w: 4 },
    ]);
  });

  it('follows pressure for the pen', () => {
    expect(widthPoints(stroke('pen', [0, 0, 0, 0.5, -1, -1], 10))[0]?.w).toBeCloseTo(7);
  });

  it('thins a fast pen stroke that has no pressure', () => {
    const points = widthPoints(stroke('pen', [0, 0, 0, -1, -1, -1, 100, 0, 10, -1, -1, -1]));
    expect(points[0]?.w).toBe(4);
    expect(points[1]?.w).toBeCloseTo(1.2);
  });

  it('drops points closer than half a unit', () => {
    expect(
      widthPoints(stroke('marker', [10, 10, 0, -1, -1, -1, 10.2, 10, 8, -1, -1, -1])),
    ).toHaveLength(1);
  });
});

describe('outlinePath', () => {
  it('draws a capsule around a straight stroke', () => {
    expect(
      outlinePath([
        { x: 10, y: 10, w: 4 },
        { x: 50, y: 10, w: 4 },
      ]),
    ).toBe('M 10 12 L 50 12 A 2 2 0 0 0 50 8 L 10 8 A 2 2 0 0 0 10 12 Z');
  });

  it('draws a circle for a single point', () => {
    expect(outlinePath([{ x: 10, y: 10, w: 4 }])).toBe('M 8 10 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 Z');
  });
});
