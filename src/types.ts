import type { Ref } from 'react';
import type { ColorValue, ViewProps } from 'react-native';

export type BrushType = 'pen' | 'marker' | 'highlighter';

export type Brush = { type?: BrushType; color?: ColorValue; size?: number };

export type InkState = { strokeCount: number; canUndo: boolean; canRedo: boolean };

export interface InkCanvasRef {
  undo(): void;
  redo(): void;
  clear(): void;
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
