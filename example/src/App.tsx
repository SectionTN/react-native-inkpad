import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { InkCanvas, type InkState } from 'react-native-inkpad';

export default function App() {
  const [state, setState] = useState<InkState>({ strokeCount: 0, canUndo: false, canRedo: false });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.filler}>Scroll area above the canvas</Text>
      <InkCanvas
        testID="canvas"
        style={styles.canvas}
        background={{ color: '#FFFFFF' }}
        onChange={setState}
      />
      <Text testID="status">strokes: {state.strokeCount}</Text>
      <Text style={styles.filler}>Scroll area below the canvas</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 64, gap: 16 },
  canvas: { height: 320, borderWidth: 1, borderColor: '#CCCCCC' },
  filler: { height: 400 },
});
