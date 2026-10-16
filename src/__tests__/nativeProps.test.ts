import { describe, expect, it } from 'vitest';
import { toNativeInkProps } from '../nativeProps';

describe('toNativeInkProps', () => {
  it('fills in the defaults', () => {
    expect(toNativeInkProps({})).toEqual({
      brushType: 'pen',
      brushColor: '#000000',
      brushSize: 3,
      tool: 'draw',
      editable: true,
      canvasColor: undefined,
      inputMode: 'any',
      backgroundImageUri: undefined,
      backgroundFit: 'contain',
    });
  });

  it('passes given values through', () => {
    expect(
      toNativeInkProps(
        {
          brush: { type: 'marker', color: 'red', size: 8 },
          tool: 'erase',
          editable: false,
          inputMode: 'stylus',
          background: { color: '#ffffff', image: { uri: 'paper.png' }, fit: 'cover' },
        },
        (source) => (source as { uri: string }).uri,
      ),
    ).toEqual({
      brushType: 'marker',
      brushColor: 'red',
      brushSize: 8,
      tool: 'erase',
      editable: false,
      canvasColor: '#ffffff',
      inputMode: 'stylus',
      backgroundImageUri: 'paper.png',
      backgroundFit: 'cover',
    });
  });

  it('resolves the first source of an array', () => {
    const seen: unknown[] = [];
    const props = toNativeInkProps(
      { background: { image: [{ uri: 'a' }, { uri: 'b' }] } },
      (source) => {
        seen.push(source);
        return 'resolved';
      },
    );
    expect(seen).toEqual([{ uri: 'a' }]);
    expect(props.backgroundImageUri).toBe('resolved');
  });

  it('has no image without a resolver', () => {
    expect(toNativeInkProps({ background: { image: { uri: 'a' } } }).backgroundImageUri).toBe(
      undefined,
    );
  });

  it('gives the same URI for a fresh source object on every render', () => {
    const resolve = (source: unknown) => (source as { uri: string }).uri;
    const first = toNativeInkProps({ background: { image: { uri: 'x' } } }, resolve);
    const second = toNativeInkProps({ background: { image: { uri: 'x' } } }, resolve);
    expect(first.backgroundImageUri).toBe('x');
    expect(second.backgroundImageUri).toBe('x');
  });
});
