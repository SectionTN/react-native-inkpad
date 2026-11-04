import type { ColorValue } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InkDocument } from '../document';
import { renderSVG } from '../render/renderSVG';

const PAPER = 7;

// processColor gives an object for PlatformColor and DynamicColorIOS.
vi.mock('react-native', () => ({
  processColor(color: unknown) {
    if (color === '#FF0000') return 0xffff0000;
    return typeof color === 'object' ? { semantic: ['label'] } : undefined;
  },
  Image: {
    resolveAssetSource: (source: unknown) =>
      source === PAPER ? { uri: 'file:///paper.png', width: 20, height: 10, scale: 1 } : source,
  },
}));

const doc: InkDocument = { version: 1, size: { width: 10, height: 10 }, strokes: [] };
const blank =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"></svg>';
const platformColor = { semantic: ['label'] } as unknown as ColorValue;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('renderSVG', () => {
  it('resolves the color and image through React Native', () => {
    expect(renderSVG(doc, { background: { color: '#FF0000', image: PAPER, fit: 'cover' } })).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10">' +
        '<rect x="0" y="0" width="10" height="10" fill="rgb(255,0,0)" fill-opacity="1"/>' +
        '<image href="file:///paper.png" x="0" y="0" width="10" height="10" preserveAspectRatio="xMidYMid slice"/>' +
        '</svg>',
    );
  });

  it('leaves out a color with no concrete value and warns in development', () => {
    vi.stubGlobal('__DEV__', true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(renderSVG(doc, { background: { color: platformColor } })).toBe(blank);
    expect(warn).toHaveBeenCalledWith(
      'react-native-inkpad: background.color has no concrete value, so the render leaves it out. Pass a concrete color (hex, rgb() or a named color).',
    );
  });

  it('stays quiet for a concrete color and in production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('__DEV__', true);
    renderSVG(doc, { background: { color: '#FF0000' } });
    vi.stubGlobal('__DEV__', false);
    renderSVG(doc, { background: { color: platformColor } });
    expect(warn).not.toHaveBeenCalled();
  });
});
