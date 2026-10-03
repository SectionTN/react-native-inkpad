import type { Ref } from 'react';
import type { ColorValue, ViewProps } from 'react-native';
import type { BrushType, InkDocument } from './document';

export type { BrushType };

export type Brush = { type?: BrushType; color?: ColorValue; size?: number };

export type InkState = { strokeCount: number; canUndo: boolean; canRedo: boolean };

export interface InkCanvasRef {
  undo(): void;
  redo(): void;
  clear(): void;
  getStrokes(): Promise<InkDocument>;
  setStrokes(doc: InkDocument): Promise<void>;
  toImage(options?: ImageOptions): Promise<ImageResult>;
  toSVG(options?: SvgOptions): Promise<string>;
}

export type InkCanvasProps = ViewProps & {
  ref?: Ref<InkCanvasRef>;
  brush?: Brush;
  tool?: 'draw' | 'erase';
  editable?: boolean;
  background?: { color?: ColorValue };
  onStrokeStart?: () => void;
  onStrokeEnd?: () => void;
  onChange?: (state: InkState) => void;
};

export type Trim = boolean | { padding: number };

export type ImageOptions = {
  format?: 'png' | 'jpeg';
  quality?: number;
  scale?: number;
  trim?: Trim;
  background?: boolean;
  base64?: boolean;
};

export type ImageResult = { uri: string; width: number; height: number; base64?: string };

export type SvgOptions = { trim?: Trim; background?: boolean };
