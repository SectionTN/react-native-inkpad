import { describe, expect, it } from 'vitest';
import type { InkDocument, InkStroke } from '../document';
import { ErrorCode } from '../errors';
import { toSVG } from '../svg/toSVG';

const doc = (strokes: InkStroke[]): InkDocument => ({
  version: 1,
  size: { width: 300, height: 200 },
  strokes,
});

const line: InkStroke = {
  brush: { type: 'marker', color: '#FF000080', size: 4 },
  input: 'touch',
  points: [10, 10, 0, -1, -1, -1, 50, 10, 16, -1, -1, -1],
};

describe('toSVG', () => {
  it('sizes an empty canvas to the document', () => {
    expect(toSVG(doc([]))).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"></svg>',
    );
  });

  it('fills one path per stroke with the brush color', () => {
    expect(toSVG(doc([line]))).toContain(
      '<path d="M 10 12 L 50 12 A 2 2 0 0 0 50 8 L 10 8 A 2 2 0 0 0 10 12 Z" fill="rgb(255,0,0)" fill-opacity="0.5"/>',
    );
  });

  it('trims to the strokes with padding', () => {
    expect(toSVG(doc([line]), { trim: { padding: 2 } })).toContain(
      'width="48" height="8" viewBox="6 6 48 8"',
    );
  });

  it('draws the background color under the strokes', () => {
    expect(toSVG(doc([]), { backgroundColor: '#FFFFFFFF' })).toContain(
      '<rect x="0" y="0" width="300" height="200" fill="rgb(255,255,255)" fill-opacity="1"/>',
    );
  });

  it('makes an opaque highlighter translucent', () => {
    const highlighter: InkStroke = {
      ...line,
      brush: { type: 'highlighter', color: '#FFE600FF', size: 4 },
    };
    expect(toSVG(doc([highlighter]))).toContain(
      'fill-opacity="0.4" style="mix-blend-mode:multiply"',
    );
  });

  it('links the background image across the canvas', () => {
    expect(
      toSVG(doc([]), { backgroundImage: { uri: 'https://x.test/a.png', fit: 'contain' } }),
    ).toContain(
      '<image href="https://x.test/a.png" x="0" y="0" width="300" height="200" preserveAspectRatio="xMidYMid meet"/>',
    );
  });

  it('slices the background image when it covers', () => {
    expect(
      toSVG(doc([]), { backgroundImage: { uri: 'https://x.test/a.png', fit: 'cover' } }),
    ).toContain('preserveAspectRatio="xMidYMid slice"');
  });

  it('escapes the image URI', () => {
    expect(
      toSVG(doc([]), {
        backgroundImage: { uri: 'https://x.test/a.png?w=1&h="2"', fit: 'contain' },
      }),
    ).toContain('href="https://x.test/a.png?w=1&amp;h=&quot;2&quot;"');
  });

  it('leaves out an image URI with no scheme', () => {
    expect(toSVG(doc([]), { backgroundImage: { uri: 'src_paper', fit: 'contain' } })).not.toContain(
      '<image',
    );
  });

  it('puts the image between the color and the strokes', () => {
    const svg = toSVG(doc([line]), {
      backgroundColor: '#FFFFFFFF',
      backgroundImage: { uri: 'file:///a.png', fit: 'contain' },
    });
    expect(svg.indexOf('<rect')).toBeLessThan(svg.indexOf('<image'));
    expect(svg.indexOf('<image')).toBeLessThan(svg.indexOf('<path'));
  });

  it('keeps the image in place when trimming', () => {
    const svg = toSVG(doc([line]), {
      trim: true,
      backgroundImage: { uri: 'file:///a.png', fit: 'contain' },
    });
    expect(svg).toContain('viewBox="8 8 44 4"');
    expect(svg).toContain('x="0" y="0" width="300" height="200" preserveAspectRatio');
  });

  it('rejects trimming an empty canvas', () => {
    let error: unknown;
    try {
      toSVG(doc([]), { trim: true });
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({ code: ErrorCode.EMPTY });
  });
});
