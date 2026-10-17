export const DOCUMENT_VERSION = 1;
export const POINT_STRIDE = 6;
export const BRUSH_TYPES = ['pen', 'marker', 'highlighter'] as const;
export const INPUT_TYPES = ['touch', 'stylus', 'mouse'] as const;

/** Pen, marker or highlighter. */
export type BrushType = (typeof BRUSH_TYPES)[number];
/** What drew a stroke. */
export type InputType = (typeof INPUT_TYPES)[number];

/** A stroke's brush as stored: `color` is `#RRGGBBAA`, `size` is in layout units. */
export type InkBrush = { type: BrushType; color: string; size: number };

/** One stroke. `points` holds 6 numbers per point: x, y, time in ms, pressure, tilt and orientation, -1 when unknown. */
export type InkStroke = { brush: InkBrush; input: InputType; points: number[] };

/** Strokes as a plain object you can store as JSON. Every later version loads version 1. */
export type InkDocument = {
  version: typeof DOCUMENT_VERSION;
  size: { width: number; height: number };
  strokes: InkStroke[];
};
