import { describe, expect, it } from 'vitest';
import type { InkStroke, InputType } from '../document';
import { cachedWidthPoints, outlinePath, widthPoints } from '../geometry/outline';
import { penWidths } from '../geometry/penModel';

const stroke = (
  type: 'pen' | 'marker',
  points: number[],
  size = 4,
  input: InputType = 'touch',
): InkStroke => ({
  brush: { type, color: '#000000FF', size },
  input,
  points,
});

describe('widthPoints', () => {
  it('keeps the brush size for a marker', () => {
    expect(widthPoints(stroke('marker', [10, 10, 0, -1, -1, -1, 50, 10, 16, -1, -1, -1]))).toEqual([
      { x: 10, y: 10, w: 4 },
      { x: 50, y: 10, w: 4 },
    ]);
  });

  it('follows the pen model', () => {
    const points: number[] = [];
    for (let i = 0; i < 40; i++) points.push(i * 6, i * i * 0.2, i * 8, 0.6 + i * 0.01, -1, -1);
    for (const input of ['touch', 'stylus'] as const) {
      const widths = widthPoints(stroke('pen', points, 5, input)).map((point) => point.w);
      expect(widths).toEqual(penWidths(points, 5, input));
    }
  });

  it('ignores pressure that a touch screen reports', () => {
    const pressed = stroke('pen', [0, 0, 0, 1, -1, -1, 100, 0, 10, 1, -1, -1]);
    const plain = stroke('pen', [0, 0, 0, -1, -1, -1, 100, 0, 10, -1, -1, -1]);
    expect(widthPoints(pressed)).toEqual(widthPoints(plain));
  });

  it('stays fast on long strokes', () => {
    const points: number[] = [];
    for (let i = 0; i < 5000; i++) points.push(i * 2, Math.sin(i / 20) * 50, i * 8, -1, -1, -1);
    const long = stroke('pen', points);
    widthPoints(long);
    // About 6 ms on an idle M1; the budget only catches quadratic work, and the best of five absorbs load.
    const runs = Array.from({ length: 5 }, () => {
      const started = performance.now();
      widthPoints(long);
      return performance.now() - started;
    });
    expect(Math.min(...runs)).toBeLessThan(100);
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

describe('cachedWidthPoints', () => {
  it('computes a stroke widths once and keeps strokes apart', () => {
    const a = stroke('pen', [0, 0, 0, -1, -1, -1, 10, 0, 16, -1, -1, -1]);
    const b = stroke('pen', [0, 0, 0, -1, -1, -1, 0, 30, 16, -1, -1, -1]);
    expect(cachedWidthPoints(a)).toBe(cachedWidthPoints(a));
    expect(cachedWidthPoints(a)).toEqual(widthPoints(a));
    expect(cachedWidthPoints(b)).toEqual(widthPoints(b));
    expect(cachedWidthPoints(b)).not.toEqual(cachedWidthPoints(a));
  });
});
