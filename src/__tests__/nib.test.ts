import { describe, expect, it } from 'vitest';
import type { InkStroke } from '../document';
import { crossSection, highlighterNib, nibFor } from '../geometry/nib';
import { outlinePath } from '../geometry/outline';

const ROTATION = (150 * Math.PI) / 180;
const along = (x: number, y: number) => {
  const length = Math.hypot(x, y);
  return [x / length, y / length] as const;
};
const dot = (v: { x: number; y: number }, [x, y]: readonly [number, number]) => v.x * x + v.y * y;

const highlighter = (points: number[], size = 20): InkStroke => ({
  brush: { type: 'highlighter', color: '#FFEB3B', size },
  input: 'touch',
  points,
});

describe('highlighterNib', () => {
  const nib = highlighterNib(20);

  it('reaches 10 along the tip and 2.5 across it', () => {
    const length = along(-Math.sin(ROTATION), Math.cos(ROTATION));
    const across = along(Math.cos(ROTATION), Math.sin(ROTATION));
    expect(dot(nib(...length), length)).toBeCloseTo(10, 6);
    expect(dot(nib(...across), across)).toBeCloseTo(2.5, 6);
  });

  it('gives horizontal strokes 17.99 and vertical strokes 12.5', () => {
    expect(crossSection(nib, 0, 1)).toBeCloseTo(17.99, 2);
    expect(crossSection(nib, 1, 0)).toBeCloseTo(12.5, 2);
  });

  it('tells the two diagonals apart', () => {
    expect(crossSection(nib, ...along(1, 1))).toBeCloseTo(19.49, 2);
    expect(crossSection(nib, ...along(1, -1))).toBeCloseTo(8.88, 2);
  });
});

describe('nibFor', () => {
  const corner = along(
    -Math.sin(ROTATION) + Math.cos(ROTATION),
    Math.cos(ROTATION) + Math.sin(ROTATION),
  );

  it('rounds the tip fully once a stroke is a seventh of the size long', () => {
    const nib = nibFor(highlighter([0, 0, 0, -1, -1, -1, 40, 0, 16, -1, -1, -1]));
    expect(dot(nib?.(...corner) ?? { x: 0, y: 0 }, corner)).toBeCloseTo(7.803, 3);
  });

  it('leaves a tap 0.9 round', () => {
    const nib = nibFor(highlighter([0, 0, 0, -1, -1, -1]));
    expect(dot(nib?.(...corner) ?? { x: 0, y: 0 }, corner)).toBeCloseTo(7.907, 3);
  });

  it('keeps pens and markers round', () => {
    const pen: InkStroke = {
      ...highlighter([0, 0, 0, -1, -1, -1]),
      brush: { type: 'pen', color: '#000000', size: 4 },
    };
    expect(nibFor(pen)).toBeUndefined();
  });
});

describe('outlinePath with a nib', () => {
  it('sweeps the chisel along a horizontal stroke', () => {
    const nib = highlighterNib(20);
    const path = outlinePath(
      [
        { x: 0, y: 0, w: 20 },
        { x: 100, y: 0, w: 20 },
      ],
      nib,
    );
    expect(path).not.toContain('A');
    const numbers = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    const ys = numbers.filter((_, i) => i % 2 === 1);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(17.99, 1);
  });
});
