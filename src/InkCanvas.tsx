import { toNativeInkProps } from './nativeProps';
import NativeInkpadView from './specs/InkpadViewNativeComponent';
import type { InkCanvasProps } from './types';

export function InkCanvas({
  brush,
  editable,
  background,
  onStrokeStart,
  onStrokeEnd,
  onChange,
  ...viewProps
}: InkCanvasProps) {
  return (
    <NativeInkpadView
      {...viewProps}
      {...toNativeInkProps({ brush, editable, background })}
      onInkStrokeStart={() => onStrokeStart?.()}
      onInkStrokeEnd={() => onStrokeEnd?.()}
      onInkChange={(event) => onChange?.(event.nativeEvent)}
    />
  );
}
