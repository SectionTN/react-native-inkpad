import { describe, expect, it, vi } from 'vitest';
import type { InkDocument } from '../document';
import { renderSVG } from '../render/renderSVG';

const PAPER = 7;

vi.mock('react-native', () => ({
  processColor: (color: unknown) => (color === '#FF0000' ? 0xffff0000 : undefined),
  Image: {
    resolveAssetSource: (source: unknown) =>
      source === PAPER ? { uri: 'file:///paper.png', width: 20, height: 10, scale: 1 } : source,
  },
}));

const doc: InkDocument = { version: 1, size: { width: 10, height: 10 }, strokes: [] };

describe('renderSVG', () => {
  it('resolves the color and image through React Native', () => {
    expect(renderSVG(doc, { background: { color: '#FF0000', image: PAPER, fit: 'cover' } })).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10">' +
        '<rect x="0" y="0" width="10" height="10" fill="rgb(255,0,0)" fill-opacity="1"/>' +
        '<image href="file:///paper.png" x="0" y="0" width="10" height="10" preserveAspectRatio="xMidYMid slice"/>' +
        '</svg>',
    );
  });
});
