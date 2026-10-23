import { describe, expect, it } from 'vitest';
import type { InputType } from '../document';
import { penWidths } from '../geometry/penModel';

type Options = { dt?: number; pressure?: number };

// Raw points every `dt` ms along `at`, without tilt or orientation.
function trace(
  count: number,
  at: (i: number) => number[],
  { dt = 8, pressure = -1 }: Options = {},
) {
  const points: number[] = [];
  for (let i = 0; i < count; i++) points.push(...at(i), i * dt, pressure, -1, -1);
  return points;
}

const right = (count: number, step: number, options?: Options) =>
  trace(count, (i) => [i * step, 0], options);
const down = (count: number, step: number) => trace(count, (i) => [0, i * step]);
const up = (count: number, step: number) => trace(count, (i) => [0, (count - i) * step]);

const middleWidth = (points: number[], input: InputType, size = 6) => {
  const widths = penWidths(points, size, input);
  return widths[Math.floor(widths.length / 2)] as number;
};

describe('penWidths', () => {
  it('thins a fast finger stroke to 0.3', () => {
    expect(middleWidth(right(80, 24), 'touch')).toBeCloseTo(1.8, 3);
  });

  it('keeps a slow finger stroke near full size', () => {
    expect(Math.abs(middleWidth(right(400, 0.16), 'touch') - 6)).toBeLessThan(0.1);
  });

  it('thickens downstrokes by 1.17', () => {
    expect(middleWidth(down(200, 8), 'stylus')).toBeCloseTo(7.02, 3);
    expect(middleWidth(up(200, 8), 'stylus')).toBeCloseTo(6, 3);
  });

  it('thickens with stylus pressure from 0.8', () => {
    expect(middleWidth(right(200, 8, { pressure: 1 }), 'stylus')).toBeCloseTo(9, 3);
    expect(middleWidth(right(200, 8, { pressure: 0.9 }), 'stylus')).toBeCloseTo(7.5, 3);
    expect(middleWidth(right(200, 8, { pressure: 0.5 }), 'stylus')).toBeCloseTo(6, 3);
  });

  it('ignores speed for a stylus', () => {
    expect(middleWidth(right(80, 24, { pressure: 0.5 }), 'stylus')).toBeCloseTo(6, 3);
  });

  it('tapers the last three sizes to 0.75', () => {
    const widths = penWidths(right(400, 0.5), 6, 'stylus');
    expect(widths.at(-1)).toBeCloseTo(4.5, 3);
    expect(Math.abs((widths.at(-19) as number) - 5.25)).toBeLessThan(0.02);
  });

  it('draws a tap at 0.75', () => {
    expect(penWidths([10, 10, 0, -1, -1, -1], 6, 'touch')).toEqual([4.5]);
  });

  it('clamps the product at 2', () => {
    const lead = 30;
    const radius = 300;
    const step = 24;
    // Down, then curving right hard enough for the lateral acceleration behavior.
    const curve = (i: number) => {
      if (i < lead) return [0, i * step];
      const angle = ((i - lead) * step) / radius;
      return [radius - radius * Math.cos(angle), (lead - 1) * step + radius * Math.sin(angle)];
    };
    const widths = penWidths(trace(60, curve, { pressure: 1 }), 6, 'stylus');
    expect(Math.max(...widths)).toBeCloseTo(12, 3);
  });

  it('clamps the brush size to 0.5-200', () => {
    expect(middleWidth(right(400, 8), 'stylus', 500)).toBeCloseTo(200, 3);
    expect(middleWidth(right(400, 8), 'stylus', 0.1)).toBeCloseTo(0.5, 3);
  });

  it('handles repeated times and positions', () => {
    const points = [0, 0, 0, -1, -1, -1, 0, 0, 0, -1, -1, -1, 5, 0, 8, -1, -1, -1];
    points.push(5, 0, 8, -1, -1, -1, 5, 0, 8, -1, -1, -1, 10, 0, 16, -1, -1, -1);
    const widths = penWidths(points, 6, 'touch');
    expect(widths).toHaveLength(6);
    for (const width of widths) expect(Number.isFinite(width) && width > 0).toBe(true);
  });

  it('skips pressure for a stylus that does not report it', () => {
    expect(middleWidth(right(200, 8), 'stylus')).toBeCloseTo(6, 3);
  });
});
