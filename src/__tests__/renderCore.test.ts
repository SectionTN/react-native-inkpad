import { describe, expect, it } from 'vitest';
import type { InkDocument } from '../document';
import { ErrorCode, InkpadError } from '../errors';
import { type BackgroundResolvers, renderSvgWith, resolveBackground } from '../render/core';
import { toSVG } from '../svg/toSVG';

const doc: InkDocument = {
  version: 1,
  size: { width: 300, height: 200 },
  strokes: [
    {
      brush: { type: 'pen', color: '#000000FF', size: 4 },
      input: 'touch',
      points: [10, 10, 0, -1, -1, -1, 50, 10, 16, -1, -1, -1],
    },
  ],
};

const resolvers: BackgroundResolvers<unknown, unknown> = {
  color: (value) => (typeof value === 'string' ? '#FFFFFFFF' : undefined),
  image: (source) => (typeof source === 'string' ? `https://x/${source}` : undefined),
};

describe('resolveBackground', () => {
  it('resolves color and image through the resolvers', () => {
    expect(resolveBackground({ color: 'c', image: 'p.png', fit: 'cover' }, resolvers)).toEqual({
      color: '#FFFFFFFF',
      uri: 'https://x/p.png',
      fit: 'cover',
    });
  });

  it('defaults fit to contain', () => {
    expect(resolveBackground({ image: 'p.png' }, resolvers).fit).toBe('contain');
    expect(resolveBackground(undefined, resolvers)).toEqual({
      color: undefined,
      uri: undefined,
      fit: 'contain',
    });
  });

  it('uses the first entry of an array source', () => {
    expect(resolveBackground({ image: ['a.png', 'b.png'] }, resolvers).uri).toBe('https://x/a.png');
  });

  it("drops a color the resolver can't read", () => {
    expect(resolveBackground({ color: {} }, resolvers).color).toBeUndefined();
  });

  it('throws E_IMAGE_LOAD for an image with no usable URI', () => {
    for (const image of [{}, ''] as const) {
      const call = () =>
        resolveBackground(
          { image },
          { color: resolvers.color, image: () => (image === '' ? '' : undefined) },
        );
      expect(call).toThrow(InkpadError);
      expect(call).toThrow(expect.objectContaining({ code: ErrorCode.IMAGE_LOAD }));
    }
  });

  it('passes through an InkpadError from the resolver', () => {
    const error = new InkpadError(ErrorCode.IMAGE_LOAD, 'numeric');
    const throwing = {
      color: resolvers.color,
      image: () => {
        throw error;
      },
    };
    expect(() => resolveBackground({ image: 1 }, throwing)).toThrow(error);
  });
});

describe('renderSvgWith', () => {
  it('leaves the background out when none is given', () => {
    expect(renderSvgWith(doc, undefined, resolvers)).toBe(toSVG(doc));
  });

  it('matches toSVG with the same background', () => {
    const fixed = { color: () => '#FFFFFFFF', image: () => 'https://x/p.png' };
    expect(
      renderSvgWith(
        doc,
        { trim: true, background: { color: 'c', image: 'i', fit: 'cover' } },
        fixed,
      ),
    ).toBe(
      toSVG(doc, {
        trim: true,
        backgroundColor: '#FFFFFFFF',
        backgroundImage: { uri: 'https://x/p.png', fit: 'cover' },
      }),
    );
  });

  it('throws E_INVALID_DOCUMENT for a bad document', () => {
    expect(() => renderSvgWith({ version: 1 }, undefined, resolvers)).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_DOCUMENT }),
    );
  });
});
