import type * as React from 'react';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { Image, PixelRatio, processColor } from 'react-native';
import { argbToHex } from './color';
import { validateDocument } from './document';
import { ErrorCode, InkpadError, notMounted, toInkpadError } from './errors';
import { toNativeImageOptions, withBackground } from './imageOptions';
import { type ResolveImage, toNativeInkProps } from './nativeProps';
import { Requests } from './requests';
import NativeInkpadView, { Commands } from './specs/InkpadViewNativeComponent';
import { toSVG } from './svg/toSVG';
import type { ImageResult, InkCanvasProps } from './types';
import { usePropWarnings } from './usePropWarnings';

type NativeRef = React.ComponentRef<typeof NativeInkpadView>;

const resolveImage: ResolveImage = (source) => Image.resolveAssetSource(source)?.uri;

/** A native ink canvas: androidx.ink on Android, PencilKit on iOS, Canvas 2D on web. */
export function InkCanvas({
  ref,
  brush,
  tool,
  inputMode,
  editable,
  background,
  onStrokeStart,
  onStrokeEnd,
  onChange,
  onError,
  ...viewProps
}: InkCanvasProps) {
  usePropWarnings({ brush, background });
  const nativeRef = useRef<NativeRef>(null);
  const requestsRef = useRef<Requests | null>(null);
  requestsRef.current ??= new Requests();
  const requests = requestsRef.current;
  const processed = processColor(background?.color);
  const backgroundHex = typeof processed === 'number' ? argbToHex(processed) : undefined;
  const inkProps = toNativeInkProps({ brush, tool, editable, background, inputMode }, resolveImage);
  const imageUri = inkProps.backgroundImageUri;
  const imageFit = inkProps.backgroundFit;

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
        if (!node) throw notMounted();
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
        const native = withBackground(toNativeImageOptions(options, PixelRatio.get()), {
          color: backgroundHex,
          uri: imageUri,
          fit: imageFit,
        });
        const payload = await send((node, requestId) =>
          Commands.exportImage(node, requestId, JSON.stringify(native)),
        );
        return JSON.parse(payload) as ImageResult;
      },
      toSVG: async (options = {}) =>
        toSVG(await getStrokes(), {
          trim: options.trim,
          backgroundColor: options.background === false ? undefined : backgroundHex,
          backgroundImage:
            options.background === false || !imageUri
              ? undefined
              : { uri: imageUri, fit: imageFit },
        }),
    };
  }, [requests, backgroundHex, imageUri, imageFit]);

  return (
    <NativeInkpadView
      {...viewProps}
      {...inkProps}
      ref={nativeRef}
      onInkStrokeStart={() => onStrokeStart?.()}
      onInkStrokeEnd={() => onStrokeEnd?.()}
      onInkChange={(event) => onChange?.(event.nativeEvent)}
      onInkResult={(event) => requests.settle(event.nativeEvent)}
      onInkError={(event) => {
        const { code, message } = event.nativeEvent;
        if (onError) onError(toInkpadError(code, message));
        else if (__DEV__) console.warn(`react-native-inkpad: ${message}`);
      }}
    />
  );
}
