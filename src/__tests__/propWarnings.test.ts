import { describe, expect, it } from 'vitest';
import { propWarnings } from '../propWarnings';

const parses = (color: unknown) => color !== 'reed' && color !== 'nope';

describe('propWarnings', () => {
  it('stays quiet for valid props', () => {
    expect(
      propWarnings({ brush: { color: 'red', size: 3 }, background: { color: '#fff' } }, parses),
    ).toEqual([]);
    expect(propWarnings({}, parses)).toEqual([]);
  });

  it('names colors that do not parse and what happens instead', () => {
    expect(
      propWarnings({ brush: { color: 'reed' }, background: { color: 'nope' } }, parses),
    ).toEqual([
      'brush.color "reed" is not a color, so the brush draws black',
      'background.color "nope" is not a color, so the canvas stays transparent',
    ]);
  });

  it('names a brush size that is not a positive number', () => {
    expect(propWarnings({ brush: { size: 0 } }, parses)).toEqual([
      'brush.size 0 is not a positive number',
    ]);
    expect(propWarnings({ brush: { size: Number.NaN } }, parses)).toEqual([
      'brush.size NaN is not a positive number',
    ]);
  });
});
