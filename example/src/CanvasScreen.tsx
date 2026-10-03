import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { InkCanvas, type InkCanvasRef, type InkState } from 'react-native-inkpad';

export function CanvasScreen() {
  const canvas = useRef<InkCanvasRef>(null);
  const [state, setState] = useState<InkState>({ strokeCount: 0, canUndo: false, canRedo: false });
  const [erasing, setErasing] = useState(false);

  const actions = [
    { id: 'undo', label: 'Undo', run: () => canvas.current?.undo() },
    { id: 'redo', label: 'Redo', run: () => canvas.current?.redo() },
    { id: 'clear', label: 'Clear', run: () => canvas.current?.clear() },
    {
      id: 'eraser',
      label: `Eraser: ${erasing ? 'on' : 'off'}`,
      run: () => setErasing((on) => !on),
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
        strokes: {state.strokeCount} | canUndo: {state.canUndo ? 'yes' : 'no'}
      </Text>
      <InkCanvas
        ref={canvas}
        testID="canvas"
        tool={erasing ? 'erase' : 'draw'}
        style={styles.canvas}
        background={{ color: '#FFFFFF' }}
        onChange={setState}
      />
      <Text style={styles.filler}>Scroll area below the canvas</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 64, gap: 16 },
  canvas: { height: 320, borderWidth: 1, borderColor: '#CCCCCC' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 6 },
  filler: { height: 400 },
});
