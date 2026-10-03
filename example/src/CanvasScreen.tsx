import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { InkCanvas, type InkCanvasRef, type InkState } from 'react-native-inkpad';
import { sample } from './sample';

export function CanvasScreen() {
  const canvas = useRef<InkCanvasRef>(null);
  const [state, setState] = useState<InkState>({ strokeCount: 0, canUndo: false, canRedo: false });
  const [erasing, setErasing] = useState(false);
  const [note, setNote] = useState('none');
  const [preview, setPreview] = useState<string | null>(null);
  const report = (task: Promise<string>) => {
    task.then(setNote, (error: Error) => setNote(error.message));
  };

  const actions = [
    { id: 'undo', label: 'Undo', run: () => canvas.current?.undo() },
    { id: 'redo', label: 'Redo', run: () => canvas.current?.redo() },
    { id: 'clear', label: 'Clear', run: () => canvas.current?.clear() },
    {
      id: 'eraser',
      label: `Eraser: ${erasing ? 'on' : 'off'}`,
      run: () => setErasing((on) => !on),
    },
    {
      id: 'load-sample',
      label: 'Load sample',
      run: () =>
        report(canvas.current?.setStrokes(sample).then(() => 'loaded') ?? Promise.resolve('none')),
    },
    {
      id: 'reload',
      label: 'Reload',
      run: () =>
        report(
          (async () => {
            const doc = await canvas.current?.getStrokes();
            if (!doc) return 'none';
            await canvas.current?.setStrokes(doc);
            return `reloaded ${doc.strokes.length}`;
          })(),
        ),
    },
    {
      id: 'export-png',
      label: 'Export PNG',
      run: () =>
        report(
          canvas.current?.toImage({ trim: { padding: 8 } }).then((image) => {
            setPreview(image.uri);
            return `png ${image.width}x${image.height}`;
          }) ?? Promise.resolve('none'),
        ),
    },
    {
      id: 'export-svg',
      label: 'Export SVG',
      run: () =>
        report(
          canvas.current?.toSVG({ trim: true }).then((svg) => `svg ${svg.length} chars`) ??
            Promise.resolve('none'),
        ),
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.toolbar}>
        {actions.map((action) => (
          <Pressable key={action.id} testID={action.id} onPress={action.run} style={styles.button}>
            <Text>{action.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text testID="status">
        strokes: {state.strokeCount} | canUndo: {state.canUndo ? 'yes' : 'no'} | last: {note}
      </Text>
      <InkCanvas
        ref={canvas}
        testID="canvas"
        tool={erasing ? 'erase' : 'draw'}
        style={styles.canvas}
        background={{ color: '#FFFFFF' }}
        onChange={setState}
      />
      {preview ? (
        <Image
          testID="preview"
          source={{ uri: preview }}
          style={styles.preview}
          resizeMode="contain"
        />
      ) : null}
      <Text style={styles.filler}>Scroll area below the canvas</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  canvas: { height: 320, borderWidth: 1, borderColor: '#CCCCCC' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 6 },
  filler: { height: 400 },
  preview: { height: 120, borderWidth: 1, borderColor: '#EEEEEE' },
});
