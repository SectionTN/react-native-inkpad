import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Image, Pressable, processColor, StyleSheet, Text, View } from 'react-native';
import { argbToHex } from '../color';
import { InkCanvas } from '../InkCanvas';
import type { InkCanvasRef } from '../types';
import { CHECK_ICON, TRASH_ICON } from './icons';
import {
  asciiToBase64,
  backgroundBox,
  dataUrl,
  exportFormat,
  footerHidden,
  readPlan,
  unsupportedProps,
} from './mapProps';
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

/** A drop-in for react-native-signature-canvas: the same props and ref methods, drawn by InkCanvas. */
export default function SignatureCanvas({ ref, testID, style, ...props }: SignatureCanvasProps) {
  const ink = useRef<InkCanvasRef>(null);
  const strokeCount = useRef(0);
  const mountProps = useRef(props);
  const [penColor, setPenColor] = useState(props.penColor);
  const [penSize, setPenSize] = useState(props.maxWidth);
  const [erasing, setErasing] = useState(false);
  const [startImage, setStartImage] = useState(props.dataURL || undefined);
  const format = exportFormat(props.imageType);
  const bgBox = backgroundBox(props.bgWidth, props.bgHeight);

  useEffect(() => setPenColor(props.penColor), [props.penColor]);
  useEffect(() => setPenSize(props.maxWidth), [props.maxWidth]);
  useEffect(() => setStartImage(props.dataURL || undefined), [props.dataURL]);

  useEffect(() => {
    const first = mountProps.current;
    const ignored = unsupportedProps(first as Record<string, unknown>);
    if (ignored.length > 0) warn(`ignored props: ${ignored.join(', ')}`);
    first.onLoadEnd?.();
  }, []);

  const readSignature = async () => {
    const canvas = ink.current;
    if (!canvas) return;
    const plan = readPlan(strokeCount.current, startImage !== undefined, props.trimWhitespace);
    if (plan === 'empty') {
      props.onEmpty?.();
      return;
    }
    try {
      if (format === 'svg') {
        const svg = await canvas.toSVG({ trim: plan.trim });
        props.onOK?.(dataUrl('svg', asciiToBase64(svg)));
      } else {
        const image = await canvas.toImage({ format, trim: plan.trim, base64: true });
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
      setStartImage(undefined);
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
    setDataURL: (url) => {
      ink.current?.clear();
      setStartImage(url || undefined);
    },
    reinitialize: () => {
      ink.current?.clear();
      setStartImage(undefined);
      setErasing(false);
    },
  };

  useImperativeHandle(ref, () => actions);

  return (
    <View style={[styles.root, style]}>
      <View style={styles.pad}>
        {props.bgSrc ? (
          <Image
            source={{ uri: props.bgSrc }}
            style={[
              bgBox ? { position: 'absolute', left: 0, top: 0, ...bgBox } : StyleSheet.absoluteFill,
              styles.overlay,
            ]}
            resizeMode="contain"
          />
        ) : null}
        <InkCanvas
          ref={ink}
          testID={testID}
          style={StyleSheet.absoluteFill}
          brush={{ color: penColor ?? 'black', size: penSize ?? 2.5 }}
          tool={erasing ? 'erase' : 'draw'}
          background={{
            color: props.backgroundColor,
            image: startImage ? { uri: startImage } : undefined,
          }}
          onError={props.onError}
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
      {props.renderFooter
        ? props.renderFooter(actions)
        : !footerHidden(props.webStyle) && (
            <View style={styles.footer}>
              <Pressable
                testID="inkpad-clear"
                accessibilityRole="button"
                onPress={actions.clearSignature}
                style={({ pressed }) => [styles.button, styles.clear, pressed && styles.pressed]}
              >
                <Image source={{ uri: TRASH_ICON }} tintColor={CLEAR_INK} style={styles.icon} />
                <Text style={[styles.label, styles.clearLabel]}>{props.clearText ?? 'Clear'}</Text>
              </Pressable>
              <Text style={styles.description} numberOfLines={1}>
                {props.descriptionText ?? 'Sign above'}
              </Text>
              <Pressable
                testID="inkpad-confirm"
                accessibilityRole="button"
                onPress={actions.readSignature}
                style={({ pressed }) => [styles.button, styles.confirm, pressed && styles.pressed]}
              >
                <Image source={{ uri: CHECK_ICON }} tintColor="#FFFFFF" style={styles.icon} />
                <Text style={[styles.label, styles.confirmLabel]}>
                  {props.confirmText ?? 'Confirm'}
                </Text>
              </Pressable>
            </View>
          )}
    </View>
  );
}

const CLEAR_INK = '#1C1C1E';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  pad: { flex: 1, backgroundColor: '#FFFFFF' },
  overlay: { pointerEvents: 'none' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: 8,
  },
  clear: { backgroundColor: '#F2F2F7' },
  confirm: { backgroundColor: '#2F6FED' },
  pressed: { opacity: 0.7 },
  icon: { width: 14, height: 14 },
  label: { fontSize: 14, fontWeight: '600' },
  clearLabel: { color: CLEAR_INK },
  confirmLabel: { color: '#FFFFFF' },
  description: { flexShrink: 1, color: '#8E8E93', fontSize: 13, textAlign: 'center' },
});
