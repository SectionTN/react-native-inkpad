import type { ColorValue, ImageSourcePropType } from 'react-native';
import type { BackgroundFit, BrushType, InkCanvasProps, InputMode } from './types';

export type NativeInkProps = {
  brushType: BrushType;
  brushColor: ColorValue;
  brushSize: number;
  tool: 'draw' | 'erase';
  editable: boolean;
  canvasColor: ColorValue | undefined;
  inputMode: InputMode;
  backgroundImageUri: string | undefined;
  backgroundFit: BackgroundFit;
};

export type ResolveImage = (source: ImageSourcePropType) => string | undefined;

export function toNativeInkProps(
  props: Pick<InkCanvasProps, 'brush' | 'tool' | 'editable' | 'background' | 'inputMode'>,
  resolveImage?: ResolveImage,
): NativeInkProps {
  const image = props.background?.image;
  const source = Array.isArray(image) ? image[0] : image;
  return {
    brushType: props.brush?.type ?? 'pen',
    brushColor: props.brush?.color ?? '#000000',
    brushSize: props.brush?.size ?? 3,
    tool: props.tool ?? 'draw',
    editable: props.editable ?? true,
    canvasColor: props.background?.color,
    inputMode: props.inputMode ?? 'any',
    backgroundImageUri: source != null && resolveImage ? resolveImage(source) : undefined,
    backgroundFit: props.background?.fit ?? 'contain',
  };
}
