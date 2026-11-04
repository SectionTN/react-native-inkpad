import { beforeEach, describe, expect, it } from 'vitest';
import type { InkDocument } from '../document';
import { toNativeImageOptions, withBackground } from '../imageOptions';
import type { ImageLike } from '../web/backgroundImage';
import { type ExportCanvas, exportImage } from '../web/exportImage';
import { renderDocumentImage } from '../web/renderDocument';
import { calls, depsWith, fakeCanvas, resetFakes } from './fakeCanvas';

const doc: InkDocument = {
  version: 1,
  size: { width: 300, height: 200 },
  strokes: [
    {
      brush: { type: 'marker', color: '#000000FF', size: 4 },
      input: 'touch',
      points: [10, 10, 0, -1, -1, -1, 50, 10, 16, -1, -1, -1],
    },
  ],
};
const empty: InkDocument = { ...doc, strokes: [] };

const imageThat = (decode: () => Promise<void>) => (): ImageLike => ({
  src: '',
  crossOrigin: null,
  naturalWidth: 200,
  naturalHeight: 100,
  decode,
});
const decodes = imageThat(() => Promise.resolve());
const deps = { ...depsWith({} as Blob), createImage: decodes };

beforeEach(resetFakes);

describe('renderDocumentImage', () => {
  it('matches exportImage for the same document', async () => {
    const image = decodes();
    const base = toNativeImageOptions({ scale: 2, trim: { padding: 4 } }, 1);
    const expected = await exportImage(doc, base, '#FF0000FF', deps, { image, fit: 'cover' });
    const expectedCalls = calls.splice(0);
    const options = withBackground(base, {
      color: '#FF0000FF',
      uri: 'https://x/p.png',
      fit: 'cover',
    });
    const actual = await renderDocumentImage(doc, options, deps);
    expect(actual).toMatchObject({ width: expected.width, height: expected.height });
    expect(calls).toEqual(expectedCalls);
    expect(calls.some((call) => call.op === 'drawImage')).toBe(true);
  });

  it('renders an empty document at its size', async () => {
    let canvas: ExportCanvas | undefined;
    const sized = {
      ...deps,
      createCanvas: () => {
        canvas = fakeCanvas({} as Blob);
        return canvas;
      },
    };
    const options = withBackground(toNativeImageOptions({ scale: 2 }, 1), {
      color: undefined,
      uri: undefined,
      fit: 'contain',
    });
    await expect(renderDocumentImage(empty, options, sized)).resolves.toMatchObject({
      width: 600,
      height: 400,
    });
    expect(canvas).toMatchObject({ width: 600, height: 400 });
  });

  it('rejects E_IMAGE_LOAD when the image fails to decode', async () => {
    const broken = imageThat(() => Promise.reject(new Error('broken')));
    const options = withBackground(toNativeImageOptions({}, 1), {
      color: undefined,
      uri: 'https://x/p.png',
      fit: 'contain',
    });
    await expect(
      renderDocumentImage(doc, options, { ...deps, createImage: broken }),
    ).rejects.toMatchObject({ code: 'E_IMAGE_LOAD' });
    expect(calls).toEqual([]);
  });
});
