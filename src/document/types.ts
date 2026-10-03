export const DOCUMENT_VERSION = 1;
export const POINT_STRIDE = 6;
export const BRUSH_TYPES = ['pen', 'marker', 'highlighter'] as const;
export const INPUT_TYPES = ['touch', 'stylus', 'mouse'] as const;

export type BrushType = (typeof BRUSH_TYPES)[number];
export type InputType = (typeof INPUT_TYPES)[number];

export type InkBrush = { type: BrushType; color: string; size: number };

export type InkStroke = { brush: InkBrush; input: InputType; points: number[] };

export type InkDocument = {
  version: typeof DOCUMENT_VERSION;
  size: { width: number; height: number };
  strokes: InkStroke[];
};
