import type * as React from 'react';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { PixelRatio, processColor } from 'react-native';
import { argbToHex } from './color';
import { validateDocument } from './document';
import { ErrorCode, InkpadError } from './errors';
import { toNativeImageOptions } from './imageOptions';
import { toNativeInkProps } from './nativeProps';
import { Requests } from './requests';
import NativeInkpadView, { Commands } from './specs/InkpadViewNativeComponent';
import { toSVG } from './svg/toSVG';
import type { ImageResult, InkCanvasProps } from './types';

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
  const processed = processColor(background?.color);
  const backgroundHex = typeof processed === 'number' ? argbToHex(processed) : undefined;

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
    const getStrokes = async () => validateDocument(JSON.parse(await send(Commands.getStrokes)));
    return {
      undo: () => run(Commands.undo),
      redo: () => run(Commands.redo),
      clear: () => run(Commands.clear),
      getStrokes,
      setStrokes: async (doc) => {
        const valid = validateDocument(doc);
        await send((node, requestId) =>
          Commands.setStrokes(node, requestId, JSON.stringify(valid)),
        );
      },
      toImage: async (options = {}) => {
        const native = toNativeImageOptions(options, PixelRatio.get());
        const payload = await send((node, requestId) =>
          Commands.exportImage(node, requestId, JSON.stringify(native)),
        );
        return JSON.parse(payload) as ImageResult;
      },
      toSVG: async (options = {}) =>
        toSVG(await getStrokes(), {
          trim: options.trim,
          backgroundColor: options.background === false ? undefined : backgroundHex,
        }),
    };
  }, [requests, backgroundHex]);

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
