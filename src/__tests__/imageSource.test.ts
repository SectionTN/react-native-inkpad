import { describe, expect, it } from 'vitest';
import { uriOf } from '../web/imageSource';

describe('uriOf', () => {
  it('reads every source shape a web app passes', () => {
    expect(uriOf('a.png')).toBe('a.png');
    expect(uriOf({ uri: 'a.png' })).toBe('a.png');
    expect(uriOf([{ uri: 'a.png' }, { uri: 'b.png' }])).toBe('a.png');
    expect(uriOf({ uri: '/assets/a.png', width: 10, height: 10 })).toBe('/assets/a.png');
  });

  it('has no URI for an empty source', () => {
    expect(uriOf(undefined)).toBeUndefined();
    expect(uriOf(null)).toBeUndefined();
    expect(uriOf({})).toBeUndefined();
    expect(uriOf('')).toBeUndefined();
  });

  it('rejects a numeric asset id', () => {
    expect(() => uriOf(7)).toThrow(expect.objectContaining({ code: 'E_IMAGE_LOAD' }));
  });
});
