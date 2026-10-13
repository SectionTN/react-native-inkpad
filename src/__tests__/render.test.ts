import { beforeEach, describe, expect, it } from 'vitest';
import type { InkStroke } from '../document';
import { outlinePath, widthPoints } from '../geometry/outline';
import { drawBackground, drawStroke, drawStrokes, type MakePath } from '../web/render';

type Call = {
  op: string;
  d?: string;
  args?: number[];
  fillStyle: unknown;
  globalAlpha: number;
  globalCompositeOperation: string;
};

const points = [10, 10, 0, -1, -1, -1, 50, 10, 16, -1, -1, -1];
const pen: InkStroke = {
  brush: { type: 'pen', color: '#1C1C1EFF', size: 3 },
  input: 'touch',
  points,
};
const highlighter: InkStroke = {
  brush: { type: 'highlighter', color: '#FFD60AFF', size: 20 },
  input: 'touch',
  points,
};
const fakePath: MakePath = (d) => ({ d }) as unknown as Path2D;

let calls: Call[];
let ctx: CanvasRenderingContext2D;

// save and restore do nothing, so every value a call sees was set for that call.
beforeEach(() => {
  calls = [];
  const state = {
    fillStyle: '#000000' as unknown,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
  };
  const snapshot = () => ({ ...state });
  ctx = Object.assign(state, {
    save() {},
    restore() {},
    fill(path: { d: string }) {
      calls.push({ op: 'fill', d: path.d, ...snapshot() });
    },
    fillRect(...args: number[]) {
      calls.push({ op: 'fillRect', args, ...snapshot() });
    },
  }) as unknown as CanvasRenderingContext2D;
});

describe('render', () => {
  it('fills the outline toSVG writes', () => {
    drawStroke(ctx, pen, fakePath);
    expect(calls[0]).toMatchObject({
      op: 'fill',
      d: outlinePath(widthPoints(pen)),
      fillStyle: 'rgb(28,28,30)',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
    });
  });

  it('multiplies an opaque highlighter at 40%', () => {
    drawStroke(ctx, highlighter, fakePath);
    expect(calls[0]).toMatchObject({ globalAlpha: 0.4, globalCompositeOperation: 'multiply' });
  });

  it('sets alpha and blending for each stroke', () => {
    drawStrokes(ctx, [highlighter, pen], fakePath);
    expect(calls[1]).toMatchObject({ globalAlpha: 1, globalCompositeOperation: 'source-over' });
  });

  it('skips a transparent background', () => {
    drawBackground(ctx, '#00000000', 300, 200);
    expect(calls).toEqual([]);
  });

  it('fills an opaque background', () => {
    drawBackground(ctx, '#FFFFFFFF', 300, 200);
    expect(calls[0]).toMatchObject({
      op: 'fillRect',
      args: [0, 0, 300, 200],
      fillStyle: 'rgba(255,255,255,1)',
    });
  });
});
