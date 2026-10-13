import { describe, expect, it } from 'vitest';
import { boundsOf } from '../geometry/bounds';

describe('boundsOf', () => {
  it('boxes width points by their radius', () => {
    expect(
      boundsOf([
        { x: 10, y: 10, w: 4 },
        { x: 50, y: 12, w: 2 },
      ]),
    ).toEqual({ minX: 8, minY: 8, maxX: 51, maxY: 13 });
  });

  it('has no bounds without points', () => {
    expect(boundsOf([])).toBeNull();
  });
});
