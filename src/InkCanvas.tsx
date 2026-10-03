import type * as React from 'react';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { validateDocument } from './document';
import { ErrorCode, InkpadError } from './errors';
import { toNativeInkProps } from './nativeProps';
import { Requests } from './requests';
import NativeInkpadView, { Commands } from './specs/InkpadViewNativeComponent';
import type { InkCanvasProps } from './types';

type NativeRef = React.ElementRef<typeof NativeInkpadView>;

export function InkCanvas({
  ref,
  brush,
  tool,
  editable,
  background,
  onStrokeStart,
  onStrokeEnd,
  onChange,
  ...viewProps
}: InkCanvasProps) {
  const nativeRef = useRef<NativeRef>(null);
  const requestsRef = useRef<Requests | null>(null);
  requestsRef.current ??= new Requests();
  const requests = requestsRef.current;

  useEffect(
    () => () => requests.rejectAll(new InkpadError(ErrorCode.NOT_MOUNTED, 'InkCanvas unmounted')),
    [requests],
  );

  useImperativeHandle(ref, () => {
    const run = (command: (node: NativeRef) => void) => {
      if (nativeRef.current) command(nativeRef.current);
    };
    const send = (command: (node: NativeRef, requestId: number) => void) =>
      requests.start((requestId) => {
        const node = nativeRef.current;
        if (!node) throw new InkpadError(ErrorCode.NOT_MOUNTED, 'InkCanvas is not mounted');
        command(node, requestId);
      });
    return {
      undo: () => run(Commands.undo),
      redo: () => run(Commands.redo),
      clear: () => run(Commands.clear),
      getStrokes: async () => validateDocument(JSON.parse(await send(Commands.getStrokes))),
      setStrokes: async (doc) => {
        const valid = validateDocument(doc);
        await send((node, requestId) =>
          Commands.setStrokes(node, requestId, JSON.stringify(valid)),
        );
      },
    };
  }, [requests]);

  return (
    <NativeInkpadView
      {...viewProps}
      {...toNativeInkProps({ brush, tool, editable, background })}
      ref={nativeRef}
      onInkStrokeStart={() => onStrokeStart?.()}
      onInkStrokeEnd={() => onStrokeEnd?.()}
      onInkChange={(event) => onChange?.(event.nativeEvent)}
      onInkResult={(event) => requests.settle(event.nativeEvent)}
    />
  );
}
