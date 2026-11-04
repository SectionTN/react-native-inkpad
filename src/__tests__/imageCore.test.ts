import { describe, expect, it, vi } from 'vitest';
import type { InkDocument } from '../document';
import { ErrorCode, InkpadError } from '../errors';
import { toNativeImageOptions, withBackground } from '../imageOptions';
import type { BackgroundResolvers } from '../render/core';
import {
  nativeRender,
  oneAtATime,
  type RenderImageDeps,
  renderImageWith,
} from '../render/imageCore';
import type { ImageResult } from '../types';

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
const result: ImageResult = { uri: 'file:///a.png', width: 2, height: 1 };
const fixed: BackgroundResolvers<string, string> = {
  color: () => '#FFFFFFFF',
  image: () => 'file:///p.png',
};
const nativeOptions = withBackground(toNativeImageOptions({}, 2), {
  color: undefined,
  uri: undefined,
  fit: 'contain',
});

const spyDeps = () => {
  const render = vi.fn<RenderImageDeps['render']>(async () => result);
  return { render, deps: { defaultScale: 3, render } };
};

describe('renderImageWith', () => {
  it('passes the document and the canvas export options to render', async () => {
    const { render, deps } = spyDeps();
    const options = { maxSize: 160, background: { color: 'c', image: 'i', fit: 'cover' as const } };
    await expect(renderImageWith(doc, options, fixed, deps)).resolves.toBe(result);
    expect(render).toHaveBeenCalledWith(doc, {
      format: 'png',
      quality: 0.9,
      scale: 3,
      trim: false,
      padding: 0,
      background: true,
      base64: false,
      maxSize: 160,
      backgroundColor: '#FFFFFFFF',
      backgroundImageUri: 'file:///p.png',
      backgroundFit: 'cover',
    });
  });

  it('sends a transparent background when none is given', async () => {
    const { render, deps } = spyDeps();
    await renderImageWith(doc, undefined, fixed, deps);
    expect(render.mock.calls[0]?.[1]).toMatchObject({
      background: true,
      backgroundColor: '',
      backgroundImageUri: '',
      backgroundFit: 'contain',
    });
  });

  it('rejects a bad document without calling render', async () => {
    const { render, deps } = spyDeps();
    let call: Promise<ImageResult> | undefined;
    expect(() => {
      call = renderImageWith(null, undefined, fixed, deps);
    }).not.toThrow();
    await expect(call).rejects.toMatchObject({ code: 'E_INVALID_DOCUMENT' });
    expect(render).not.toHaveBeenCalled();
  });

  it('rejects E_IMAGE_LOAD for an unusable source', async () => {
    const { render, deps } = spyDeps();
    const unusable = { color: fixed.color, image: () => undefined };
    await expect(
      renderImageWith(doc, { background: { image: 'i' } }, unusable, deps),
    ).rejects.toMatchObject({ code: 'E_IMAGE_LOAD' });
    expect(render).not.toHaveBeenCalled();
  });
});

describe('nativeRender', () => {
  it('rejects E_EXPORT_FAILED when the module is missing', async () => {
    await expect(nativeRender(null)(doc, nativeOptions)).rejects.toMatchObject({
      code: 'E_EXPORT_FAILED',
      message: 'the react-native-inkpad native module is missing; rebuild the app',
    });
  });

  it("parses the module's JSON", async () => {
    const renderImage = vi.fn(async () => '{"uri":"file:///a.png","width":2,"height":1}');
    await expect(nativeRender({ renderImage })(doc, nativeOptions)).resolves.toEqual({
      uri: 'file:///a.png',
      width: 2,
      height: 1,
    });
    expect(renderImage).toHaveBeenCalledWith(JSON.stringify(doc), JSON.stringify(nativeOptions));
  });

  it('maps a native rejection code', async () => {
    const renderImage = async (): Promise<string> => {
      throw Object.assign(new Error('nothing to trim'), { code: 'E_EMPTY' });
    };
    const call = nativeRender({ renderImage })(doc, nativeOptions);
    await expect(call).rejects.toBeInstanceOf(InkpadError);
    await expect(call).rejects.toMatchObject({ code: 'E_EMPTY', message: 'nothing to trim' });
  });
});

describe('oneAtATime', () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('starts each render after the previous one settles', async () => {
    const finish: Array<() => void> = [];
    const render = vi.fn<RenderImageDeps['render']>(
      () => new Promise((resolve) => finish.push(() => resolve(result))),
    );
    const queued = oneAtATime(render);
    const calls = [1, 2, 3].map(() => queued(doc, nativeOptions));
    for (let i = 0; i < 3; i++) {
      await flush();
      expect(render).toHaveBeenCalledTimes(i + 1);
      finish[i]?.();
    }
    await expect(Promise.all(calls)).resolves.toEqual([result, result, result]);
    expect(render).toHaveBeenNthCalledWith(3, doc, nativeOptions);
  });

  it('runs the next render after one fails', async () => {
    const render = vi
      .fn<RenderImageDeps['render']>()
      .mockRejectedValueOnce(new InkpadError(ErrorCode.EXPORT_FAILED, 'no 2d context'))
      .mockResolvedValueOnce(result);
    const queued = oneAtATime(render);
    const failed = queued(doc, nativeOptions);
    const next = queued(doc, nativeOptions);
    await expect(failed).rejects.toMatchObject({ code: 'E_EXPORT_FAILED' });
    await expect(next).resolves.toBe(result);
  });
});
