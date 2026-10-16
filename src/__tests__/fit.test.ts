import { describe, expect, it } from 'vitest';
import { fitRect } from '../geometry/fit';

const square = { width: 300, height: 300 };
const wide = { width: 300, height: 200 };

describe('fitRect', () => {
  it('contains a wide image in a square box', () => {
    expect(fitRect({ width: 200, height: 100 }, square, 'contain')).toEqual({
      x: 0,
      y: 75,
      width: 300,
      height: 150,
    });
  });

  it('covers a square box with a wide image', () => {
    expect(fitRect({ width: 200, height: 100 }, square, 'cover')).toEqual({
      x: -150,
      y: 0,
      width: 600,
      height: 300,
    });
  });

  it('contains a tall image in a wide box', () => {
    expect(fitRect({ width: 100, height: 400 }, wide, 'contain')).toEqual({
      x: 125,
      y: 0,
      width: 50,
      height: 200,
    });
  });

  it('covers a wide box with a tall image', () => {
    expect(fitRect({ width: 100, height: 400 }, wide, 'cover')).toEqual({
      x: 0,
      y: -500,
      width: 300,
      height: 1200,
    });
  });

  it('fills the box exactly when the aspect ratios match', () => {
    const fill = { x: 0, y: 0, width: 300, height: 200 };
    expect(fitRect({ width: 150, height: 100 }, wide, 'contain')).toEqual(fill);
    expect(fitRect({ width: 150, height: 100 }, wide, 'cover')).toEqual(fill);
  });

  it('puts an empty image at the box center', () => {
    expect(fitRect({ width: 0, height: 0 }, wide, 'contain')).toEqual({
      x: 150,
      y: 100,
      width: 0,
      height: 0,
    });
  });
});
