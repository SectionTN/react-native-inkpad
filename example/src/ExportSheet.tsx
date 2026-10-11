import { Button, Host } from '@expo/ui';
import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet';
import SegmentedControl from '@expo/ui/community/segmented-control';
import * as Sharing from 'expo-sharing';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { Image, Platform, Share, StyleSheet, Text, View } from 'react-native';
import type { ImageResult, InkCanvasRef } from 'react-native-inkpad';
import { useTheme } from './theme';

const FORMATS = ['PNG', 'SVG', 'JSON'] as const;
type Format = (typeof FORMATS)[number];

type Props = { canvas: RefObject<InkCanvasRef | null>; open: boolean; onClose(): void };

const kb = (text: string) => `${(text.length / 1024).toFixed(1)} KB`;

// Enough to fill the preview; the full text would also become one huge accessibility label.
const PREVIEW_CHARS = 700;

export function ExportSheet({ canvas, open, onClose }: Props) {
  const theme = useTheme();
  const sheet = useRef<BottomSheetModal>(null);
  const [format, setFormat] = useState<Format>('PNG');
  const [image, setImage] = useState<ImageResult | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (open) sheet.current?.present();
    else sheet.current?.dismiss();
  }, [open]);

  useEffect(() => {
    const ink = canvas.current;
    if (!open || !ink) return;
    let live = true;
    const run = async () => {
      if (format === 'PNG') {
        const result = await ink.toImage({ trim: { padding: 8 } });
        if (!live) return;
        setImage(result);
        setStatus(`PNG · ${result.width} x ${result.height} px`);
      } else if (format === 'SVG') {
        const svg = await ink.toSVG({ trim: true });
        if (!live) return;
        setText(svg);
        setStatus(`SVG · ${kb(svg)}`);
      } else {
        const doc = await ink.getStrokes();
        const json = JSON.stringify(doc);
        if (!live) return;
        setText(json);
        setStatus(`${doc.strokes.length} strokes · ${kb(json)}`);
      }
    };
    run().catch((error: Error) => {
      if (live) setStatus(error.message);
    });
    return () => {
      live = false;
    };
  }, [canvas, open, format]);

  const reload = async () => {
    const ink = canvas.current;
    if (!ink) return;
    const doc = await ink.getStrokes();
    await ink.setStrokes(doc);
    setStatus(`Reloaded ${doc.strokes.length} strokes`);
  };

  const share = async () => {
    if (format === 'PNG' && image) await Sharing.shareAsync(image.uri, { mimeType: 'image/png' });
    else await Share.share({ message: text });
  };

  const showImage = format === 'PNG' && image !== null;

  return (
    <BottomSheetModal ref={sheet} enableDynamicSizing enablePanDownToClose onDismiss={onClose}>
      <BottomSheetView style={styles.sheet}>
        <Text style={[styles.title, { color: theme.text }]}>Export</Text>
        <SegmentedControl
          values={[...FORMATS]}
          selectedIndex={FORMATS.indexOf(format)}
          onChange={(event) => setFormat(FORMATS[event.nativeEvent.selectedSegmentIndex] ?? 'PNG')}
        />
        <View
          style={[
            styles.preview,
            {
              backgroundColor: showImage ? '#FFFFFF' : theme.surface,
              borderColor: theme.separator,
            },
          ]}
        >
          {showImage ? (
            <Image source={{ uri: image.uri }} style={styles.image} resizeMode="contain" />
          ) : (
            <Text style={[styles.code, { color: theme.text }]} numberOfLines={14}>
              {text.slice(0, PREVIEW_CHARS)}
            </Text>
          )}
        </View>
        <Text testID="export-status" style={[styles.caption, { color: theme.secondaryText }]}>
          {status}
        </Text>
        <View style={styles.actions}>
          {format === 'JSON' ? (
            <Host matchContents>
              <Button label="Load back" variant="outlined" testID="reload" onPress={reload} />
            </Host>
          ) : null}
          <Host matchContents>
            <Button label="Share" testID="share" onPress={share} />
          </Host>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: 14, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  preview: {
    height: 240,
    padding: 12,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  image: { flex: 1 },
  code: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 11 },
  caption: { fontSize: 13, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
});
