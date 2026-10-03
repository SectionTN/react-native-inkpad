import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AdapterScreen } from './AdapterScreen';
import { CanvasScreen } from './CanvasScreen';

export default function App() {
  const [tab, setTab] = useState<'canvas' | 'adapter'>('canvas');

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        <Pressable testID="canvas-tab" onPress={() => setTab('canvas')} style={styles.tab}>
          <Text>Canvas</Text>
        </Pressable>
        <Pressable testID="adapter-tab" onPress={() => setTab('adapter')} style={styles.tab}>
          <Text>Adapter</Text>
        </Pressable>
      </View>
      {tab === 'canvas' ? <CanvasScreen /> : <AdapterScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 48, backgroundColor: '#FFFFFF' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 6 },
});
