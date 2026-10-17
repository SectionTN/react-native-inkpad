import type { Ref } from 'react';
import type { ColorValue, ImageSourcePropType, ViewProps } from 'react-native';
import type { BrushType, InkDocument } from './document';
import type { InkpadError } from './errors';
import type { BackgroundFit } from './geometry/fit';

export type { BackgroundFit, BrushType };

/** The brush new strokes use. */
export type Brush = {
  /** Default `'pen'`. */
  type?: BrushType;
  /** Any React Native color. Default black. */
  color?: ColorValue;
  /** Stroke width in layout units. Default 3. */
  size?: number;
};

/** `'any'` draws with fingers, mouse and pen; `'stylus'` draws only with a pen and lets fingers scroll. */
export type InputMode = 'any' | 'stylus';

/** What sits under the strokes. Both parts are exported with them. */
export type Background = {
  /** Canvas color. Default transparent. */
  color?: ColorValue;
  /** Image drawn under the strokes. */
  image?: ImageSourcePropType;
  /** How the image fills the canvas. Default `'contain'`. */
  fit?: BackgroundFit;
};

/** The canvas state passed to `onChange`. */
export type InkState = { strokeCount: number; canUndo: boolean; canRedo: boolean };

/** Methods on the `ref` of an `InkCanvas`. */
export interface InkCanvasRef {
  /** Steps back through the history. */
  undo(): void;
  /** Steps forward through the history. */
  redo(): void;
  /** Removes every stroke. It can be undone. */
  clear(): void;
  /** Resolves to the strokes as a plain object you can store as JSON. */
  getStrokes(): Promise<InkDocument>;
  /** Replaces the drawing with a document from `getStrokes()`. It can be undone. */
  setStrokes(doc: InkDocument): Promise<void>;
  /** Exports a PNG or JPEG. */
  toImage(options?: ImageOptions): Promise<ImageResult>;
  /** Exports an SVG string. It links the background image by URI. */
  toSVG(options?: SvgOptions): Promise<string>;
}

export type InkCanvasProps = ViewProps & {
  ref?: Ref<InkCanvasRef>;
  /** Brush for new strokes. Default: a black pen, size 3. */
  brush?: Brush;
  /** `'erase'` removes whole strokes. Default `'draw'`. */
  tool?: 'draw' | 'erase';
  /** Default `'any'`. */
  inputMode?: InputMode;
  /** Set to `false` to turn drawing off. Default `true`. */
  editable?: boolean;
  /** Canvas color and an image under the strokes. Default transparent. */
  background?: Background;
  /** Called when a stroke starts. */
  onStrokeStart?: () => void;
  /** Called when a stroke ends. */
  onStrokeEnd?: () => void;
  /** Called after every change, with the stroke count and the undo and redo state. */
  onChange?: (state: InkState) => void;
  /** Called with `E_IMAGE_LOAD` when the background image fails to load. Without it, development builds warn. */
  onError?: (error: InkpadError) => void;
};

/** `true` crops the export to the strokes; `{ padding }` also adds room around them, in layout units. */
export type Trim = boolean | { padding: number };

export type ImageOptions = {
  /** Default `'png'`. */
  format?: 'png' | 'jpeg';
  /** JPEG quality from 0 to 1. Default 0.9. */
  quality?: number;
  /** Pixels per layout unit. Default: the screen's pixel ratio. */
  scale?: number;
  /** Default `false`. */
  trim?: Trim;
  /** Keeps the canvas color and background image in the export. Default `true`. */
  background?: boolean;
  /** Also resolves the image as base64. Default `false`. */
  base64?: boolean;
};

export type ImageResult = {
  /** A file URI, or a `blob:` URL on web. */
  uri: string;
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
  /** Set when `base64` was requested. */
  base64?: string;
};

export type SvgOptions = {
  /** Default `false`. */
  trim?: Trim;
  /** Keeps the canvas color and background image in the SVG. Default `true`. */
  background?: boolean;
};
