import { beforeEach, describe, expect, it } from 'vitest';
import type { InkDocument, InkStroke } from '../document';
import type { NativeImageOptions } from '../imageOptions';
import { type ExportCanvas, type ExportDeps, exportArea, exportImage } from '../web/exportImage';
import type { MakePath } from '../web/render';

const marker = (points: number[]): InkStroke => ({
  brush: { type: 'marker', color: '#000000FF', size: 4 },
  input: 'touch',
  points,
});
const line = marker([10, 10, 0, -1, -1, -1, 50, 10, 16, -1, -1, -1]);
const dot = marker([5, 5, 0, -1, -1, -1]);
const doc = (strokes: InkStroke[]): InkDocument => ({
  version: 1,
  size: { width: 300, height: 200 },
  strokes,
});
const opts = (over: Partial<NativeImageOptions>): NativeImageOptions => ({
  format: 'png',
  quality: 0.9,
  scale: 2,
  trim: false,
  padding: 0,
  background: true,
  base64: false,
  ...over,
});

type Call = { op: string; args: unknown[]; fillStyle: unknown };
let calls: Call[];
let urls: number;

const fakePath: MakePath = (d) => ({ d }) as unknown as Path2D;
const fakeCanvas = (blob: Blob | null): ExportCanvas => {
  const state = {
    fillStyle: '' as unknown,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
  };
  const record =
    (op: string) =>
    (...args: unknown[]) => {
      calls.push({ op, args, fillStyle: state.fillStyle });
    };
  const ctx = Object.assign(state, {
    save() {},
    restore() {},
    setTransform: record('setTransform'),
    fillRect: record('fillRect'),
    fill: record('fill'),
  }) as unknown as CanvasRenderingContext2D;
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toBlob: (callback) => callback(blob),
    toDataURL: () => 'data:image/png;base64,AAAA',
  };
};
const depsWith = (blob: Blob | null): ExportDeps => ({
  createCanvas: () => fakeCanvas(blob),
  createObjectURL: () => `blob:fake/${++urls}`,
  makePath: fakePath,
});
const deps = depsWith({} as Blob);
const failingDeps = depsWith(null);

beforeEach(() => {
  calls = [];
  urls = 0;
});

describe('exportArea', () => {
  it('sizes an untrimmed export to the canvas', () => {
    expect(exportArea(doc([line]), opts({}))).toMatchObject({
      x: 0,
      y: 0,
      pixelWidth: 600,
      pixelHeight: 400,
    });
  });

  it('trims to the strokes', () => {
    expect(exportArea(doc([line]), opts({ trim: true, scale: 3 }))).toEqual({
      x: 8,
      y: 8,
      width: 44,
      height: 4,
      pixelWidth: 132,
      pixelHeight: 12,
    });
  });

  it('adds padding around the strokes', () => {
    expect(exportArea(doc([line]), opts({ trim: true, padding: 5, scale: 3 }))).toMatchObject({
      pixelWidth: 162,
      pixelHeight: 42,
    });
  });

  it('trims a dot', () => {
    expect(exportArea(doc([dot]), opts({ trim: true, scale: 1 }))).toMatchObject({
      width: 4,
      height: 4,
    });
  });

  it('rejects a trimmed empty canvas', () => {
    expect(() => exportArea(doc([]), opts({ trim: true }))).toThrow(
      expect.objectContaining({ code: 'E_EMPTY' }),
    );
  });
});

describe('exportImage', () => {
  it('resolves a blob URL with the pixel size', async () => {
    await expect(exportImage(doc([line]), opts({}), undefined, deps)).resolves.toEqual({
      uri: 'blob:fake/1',
      width: 600,
      height: 400,
    });
  });

  it('adds raw base64 when asked', async () => {
    const result = await exportImage(doc([line]), opts({ base64: true }), undefined, deps);
    expect(result.base64).toBe('AAAA');
  });

  it('puts white under a JPEG', async () => {
    await exportImage(doc([line]), opts({ format: 'jpeg' }), undefined, deps);
    expect(calls[0]).toMatchObject({ op: 'fillRect', fillStyle: 'rgba(255,255,255,1)' });
  });

  it('fills the background color over the whole image', async () => {
    await exportImage(doc([line]), opts({ trim: true, scale: 3 }), '#FF0000FF', deps);
    expect(calls[0]).toMatchObject({
      op: 'fillRect',
      args: [0, 0, 132, 12],
      fillStyle: 'rgba(255,0,0,1)',
    });
  });

  it('offsets strokes by the trimmed origin', async () => {
    await exportImage(doc([line]), opts({ trim: true, scale: 3 }), undefined, deps);
    expect(calls.find((call) => call.op === 'setTransform')?.args).toEqual([3, 0, 0, 3, -24, -24]);
  });

  it('rejects when the browser cannot encode', async () => {
    await expect(exportImage(doc([line]), opts({}), undefined, failingDeps)).rejects.toMatchObject({
      code: 'E_EXPORT_FAILED',
    });
  });
});
