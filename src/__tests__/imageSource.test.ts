import { describe, expect, it } from 'vitest';
import { renderSvgWith } from '../render/core';
import { resolveImage } from '../render/resolveImage.web';
import { absoluteUri, uriOf } from '../web/imageSource';

describe('absoluteUri', () => {
  it('resolves a relative URI against the base', () => {
    expect(absoluteUri('/assets/a.png', 'https://x.test/app/')).toBe('https://x.test/assets/a.png');
    expect(absoluteUri('a.png', 'https://x.test/app/')).toBe('https://x.test/app/a.png');
  });

  it('keeps an absolute URI without a base', () => {
    expect(absoluteUri('https://x.test/a.png', undefined)).toBe('https://x.test/a.png');
  });

  it('has no URI for one that does not parse', () => {
    expect(absoluteUri('http://[', 'https://x.test/')).toBeUndefined();
    expect(absoluteUri('a.png', undefined)).toBeUndefined();
  });
});

describe('web resolveImage', () => {
  it('turns a malformed URI into E_IMAGE_LOAD', () => {
    const doc = { version: 1, size: { width: 10, height: 10 }, strokes: [] };
    const resolvers = { color: () => undefined, image: resolveImage };
    const options = { background: { image: { uri: 'http://[' } } };
    expect(() => renderSvgWith(doc, options, resolvers)).toThrow(
      expect.objectContaining({ code: 'E_IMAGE_LOAD' }),
    );
  });
});

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
