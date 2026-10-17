import type { ColorValue } from 'react-native';
import type { InkCanvasProps } from './types';

const shown = (value: unknown) =>
  typeof value === 'string' ? JSON.stringify(value) : String(value);

export function propWarnings(
  props: Pick<InkCanvasProps, 'brush' | 'background'>,
  parsesColor: (color: ColorValue) => boolean,
): string[] {
  const warnings: string[] = [];
  const { brush, background } = props;
  if (brush?.color != null && !parsesColor(brush.color)) {
    warnings.push(`brush.color ${shown(brush.color)} is not a color, so the brush draws black`);
  }
  if (background?.color != null && !parsesColor(background.color)) {
    warnings.push(
      `background.color ${shown(background.color)} is not a color, so the canvas stays transparent`,
    );
  }
  if (brush?.size !== undefined && !(Number.isFinite(brush.size) && brush.size > 0)) {
    warnings.push(`brush.size ${shown(brush.size)} is not a positive number`);
  }
  return warnings;
}
