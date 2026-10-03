import type * as React from 'react';
import { useImperativeHandle, useRef } from 'react';
import { toNativeInkProps } from './nativeProps';
import NativeInkpadView, { Commands } from './specs/InkpadViewNativeComponent';
import type { InkCanvasProps } from './types';

type NativeRef = React.ElementRef<typeof NativeInkpadView>;

export function InkCanvas({
  ref,
  brush,
  editable,
  background,
  onStrokeStart,
  onStrokeEnd,
  onChange,
  ...viewProps
}: InkCanvasProps) {
  const nativeRef = useRef<NativeRef>(null);

  useImperativeHandle(ref, () => {
    const run = (command: (node: NativeRef) => void) => {
      if (nativeRef.current) command(nativeRef.current);
    };
    return {
      undo: () => run(Commands.undo),
      redo: () => run(Commands.redo),
      clear: () => run(Commands.clear),
    };
  }, []);

  return (
    <NativeInkpadView
      {...viewProps}
      {...toNativeInkProps({ brush, editable, background })}
      ref={nativeRef}
      onInkStrokeStart={() => onStrokeStart?.()}
      onInkStrokeEnd={() => onStrokeEnd?.()}
      onInkChange={(event) => onChange?.(event.nativeEvent)}
    />
  );
}
