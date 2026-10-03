import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Image, Pressable, processColor, StyleSheet, Text, View } from 'react-native';
import { argbToHex } from '../color';
import { InkCanvas } from '../InkCanvas';
import type { InkCanvasRef } from '../types';
import { asciiToBase64, dataUrl, exportFormat, footerHidden, unsupportedProps } from './mapProps';
import { documentToPointGroups, pointGroupsToDocument } from './signaturePadData';
import type { SignatureCanvasProps, SignatureViewRef } from './types';

export type { PointGroup } from './signaturePadData';
export type { SignatureCanvasProps, SignatureViewRef } from './types';

function cssToHex(css: string): string | null {
  const value = processColor(css);
  return typeof value === 'number' ? argbToHex(value) : null;
}

function warn(message: string) {
  if (__DEV__) console.warn(`react-native-inkpad/signature-canvas: ${message}`);
}

export default function SignatureCanvas({ ref, testID, style, ...props }: SignatureCanvasProps) {
  const ink = useRef<InkCanvasRef>(null);
  const strokeCount = useRef(0);
  const mountProps = useRef(props);
  const [penColor, setPenColor] = useState(props.penColor);
  const [penSize, setPenSize] = useState(props.maxWidth);
  const [erasing, setErasing] = useState(false);
  const format = exportFormat(props.imageType);

  useEffect(() => setPenColor(props.penColor), [props.penColor]);
  useEffect(() => setPenSize(props.maxWidth), [props.maxWidth]);

  useEffect(() => {
    const first = mountProps.current;
    const ignored = unsupportedProps(first as Record<string, unknown>);
    if (ignored.length > 0) warn(`ignored props: ${ignored.join(', ')}`);
    first.onLoadEnd?.();
  }, []);

  const readSignature = async () => {
    const canvas = ink.current;
    if (!canvas) return;
    if (strokeCount.current === 0) {
      props.onEmpty?.();
      return;
    }
    try {
      if (format === 'svg') {
        const svg = await canvas.toSVG({ trim: props.trimWhitespace });
        props.onOK?.(dataUrl('svg', asciiToBase64(svg)));
      } else {
        const image = await canvas.toImage({ format, trim: props.trimWhitespace, base64: true });
        props.onOK?.(dataUrl(format, image.base64 ?? ''));
      }
      if (props.autoClear) canvas.clear();
    } catch (error) {
      props.onError?.(error as Error);
    }
  };

  const actions: SignatureViewRef = {
    readSignature: () => {
      readSignature();
    },
    clearSignature: () => {
      ink.current?.clear();
      props.onClear?.();
    },
    undo: () => {
      ink.current?.undo();
      props.onUndo?.();
    },
    redo: () => {
      ink.current?.redo();
      props.onRedo?.();
    },
    draw: () => {
      setErasing(false);
      props.onDraw?.();
    },
    erase: () => {
      setErasing(true);
      props.onErase?.();
    },
    changePenColor: (color) => {
      setPenColor(color);
      props.onChangePenColor?.();
    },
    changePenSize: (_minWidth, maxWidth) => {
      setPenSize(maxWidth);
      props.onChangePenSize?.();
    },
    getData: () => {
      ink.current?.getStrokes().then(
        (doc) => props.onGetData?.(JSON.stringify(documentToPointGroups(doc))),
        (error: Error) => props.onError?.(error),
      );
    },
    fromData: (pointGroups, suppressClear = false) => {
      const canvas = ink.current;
      if (!canvas) return;
      (async () => {
        const existing = await canvas.getStrokes();
        const { doc, skipped } = pointGroupsToDocument(pointGroups, existing.size, cssToHex);
        if (skipped > 0) warn(`skipped ${skipped} eraser or unreadable point groups`);
        await canvas.setStrokes(
          suppressClear ? { ...doc, strokes: [...existing.strokes, ...doc.strokes] } : doc,
        );
      })().catch((error: Error) => props.onError?.(error));
    },
    setDataURL: () => warn('setDataURL needs background images, which ship in 0.3'),
    reinitialize: () => {
      ink.current?.clear();
      setErasing(false);
    },
  };

  useImperativeHandle(ref, () => actions);

  return (
    <View style={[styles.root, style]}>
      <View style={styles.pad}>
        <InkCanvas
          ref={ink}
          testID={testID}
          style={StyleSheet.absoluteFill}
          brush={{ color: penColor ?? 'black', size: penSize ?? 2.5 }}
          tool={erasing ? 'erase' : 'draw'}
          background={{ color: props.backgroundColor }}
          onStrokeStart={props.onBegin}
          onStrokeEnd={props.onEnd}
          onChange={(state) => {
            strokeCount.current = state.strokeCount;
          }}
        />
        {props.overlaySrc ? (
          <Image
            source={{ uri: props.overlaySrc }}
            style={[StyleSheet.absoluteFill, styles.overlay]}
            resizeMode="contain"
          />
        ) : null}
      </View>
      {footerHidden(props.webStyle) ? null : (
        <View style={styles.footer}>
          <Text style={styles.description}>{props.descriptionText ?? 'Sign above'}</Text>
          <View style={styles.buttons}>
            <Pressable testID="inkpad-clear" onPress={actions.clearSignature} style={styles.button}>
              <Text>{props.clearText ?? 'Clear'}</Text>
            </Pressable>
            <Pressable
              testID="inkpad-confirm"
              onPress={actions.readSignature}
              style={styles.button}
            >
              <Text>{props.confirmText ?? 'Confirm'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { flex: 1, backgroundColor: '#FFFFFF' },
  overlay: { pointerEvents: 'none' },
  footer: { padding: 12, gap: 8, borderTopWidth: 1, borderColor: '#DDDDDD' },
  description: { textAlign: 'center', color: '#666666' },
  buttons: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderRadius: 6 },
});
