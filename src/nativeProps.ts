import type { ColorValue } from 'react-native';
import type { BrushType, InkCanvasProps } from './types';

export type NativeInkProps = {
  brushType: BrushType;
  brushColor: ColorValue;
  brushSize: number;
  tool: 'draw' | 'erase';
  editable: boolean;
  canvasColor: ColorValue | undefined;
};

export function toNativeInkProps(
  props: Pick<InkCanvasProps, 'brush' | 'tool' | 'editable' | 'background'>,
): NativeInkProps {
  return {
    brushType: props.brush?.type ?? 'pen',
    brushColor: props.brush?.color ?? '#000000',
    brushSize: props.brush?.size ?? 3,
    tool: props.tool ?? 'draw',
    editable: props.editable ?? true,
    canvasColor: props.background?.color,
  };
}
