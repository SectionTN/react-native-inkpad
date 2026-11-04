import type { ExportCanvas, ExportDeps } from '../web/exportImage';
import type { MakePath } from '../web/render';

export type Call = { op: string; args: unknown[]; fillStyle: unknown };

export const calls: Call[] = [];
let urls = 0;

export function resetFakes(): void {
  calls.length = 0;
  urls = 0;
}

export const fakePath: MakePath = (d) => ({ d }) as unknown as Path2D;

export const fakeCanvas = (blob: Blob | null): ExportCanvas => {
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
    beginPath() {},
    rect() {},
    clip: record('clip'),
    drawImage: (_image: unknown, ...args: unknown[]) => record('drawImage')(...args),
  }) as unknown as CanvasRenderingContext2D;
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toBlob: (callback) => callback(blob),
    toDataURL: () => 'data:image/png;base64,AAAA',
  };
};

export const depsWith = (blob: Blob | null): ExportDeps => ({
  createCanvas: () => fakeCanvas(blob),
  createObjectURL: () => `blob:fake/${++urls}`,
  makePath: fakePath,
});
