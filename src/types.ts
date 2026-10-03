import type { ColorValue, ViewProps } from 'react-native';

export type BrushType = 'pen' | 'marker' | 'highlighter';

export type Brush = { type?: BrushType; color?: ColorValue; size?: number };

export type InkState = { strokeCount: number; canUndo: boolean; canRedo: boolean };

export type InkCanvasProps = ViewProps & {
  brush?: Brush;
  editable?: boolean;
  background?: { color?: ColorValue };
  onStrokeStart?: () => void;
  onStrokeEnd?: () => void;
  onChange?: (state: InkState) => void;
};
