import SegmentedControl from '@expo/ui/community/segmented-control';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { InkCanvasRef, InkState } from 'react-native-inkpad';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { sample } from './controls';
import { DrawScreen } from './DrawScreen';
import { Modes } from './Modes';
import { SignScreen } from './SignScreen';
import { Toolbar } from './Toolbar';
import { useTheme } from './theme';

const ENGINE = Platform.select({ ios: 'PencilKit', web: 'Canvas 2D', default: 'androidx.ink' });

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const canvas = useRef<InkCanvasRef>(null);
  const [ink, setInk] = useState<InkState>({ strokeCount: 0, canUndo: false, canRedo: false });
  const [tab, setTab] = useState(0);
  const [paper, setPaper] = useState(false);
  const [pencilOnly, setPencilOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drawing = tab === 0;
  const strokes = `${ink.strokeCount} ${ink.strokeCount === 1 ? 'stroke' : 'strokes'}`;
  const status = [ENGINE, strokes, paper && 'paper', pencilOnly && 'pencil only', error]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.background },
      ]}
    >
      <StatusBar style="auto" />
      <Toolbar
        visible={drawing}
        canUndo={ink.canUndo}
        canRedo={ink.canRedo}
        canClear={ink.strokeCount > 0}
        onSample={() => canvas.current?.setStrokes(sample)}
        onUndo={() => canvas.current?.undo()}
        onRedo={() => canvas.current?.redo()}
        onClear={() => canvas.current?.clear()}
      />
      <View style={styles.heading}>
        <View style={styles.headingText}>
          <Text style={[styles.title, { color: theme.text }]}>Inkpad</Text>
          <Text testID="status" style={[styles.subtitle, { color: theme.secondaryText }]}>
            {drawing ? status : 'signature-canvas adapter'}
          </Text>
        </View>
        <Modes
          visible={drawing}
          paper={paper}
          pencilOnly={pencilOnly}
          onPaper={() => {
            setError(null);
            setPaper((on) => !on);
          }}
          onPencilOnly={() => setPencilOnly((on) => !on)}
        />
      </View>
      <SegmentedControl
        values={['Draw', 'Sign']}
        selectedIndex={tab}
        onChange={(event) => setTab(event.nativeEvent.selectedSegmentIndex)}
        style={styles.tabs}
      />
      <View style={[styles.page, !drawing && styles.hidden]}>
        <DrawScreen
          canvas={canvas}
          paper={paper}
          pencilOnly={pencilOnly}
          onChange={setInk}
          onError={(code) => setError(code)}
        />
      </View>
      <View style={[styles.page, drawing && styles.hidden]}>
        <SignScreen />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heading: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headingText: { flex: 1, gap: 2 },
  title: Platform.select({
    ios: { fontSize: 34, fontWeight: '700', letterSpacing: 0.3 },
    default: { fontSize: 32 },
  }),
  subtitle: { fontSize: Platform.OS === 'ios' ? 15 : 14 },
  tabs: { marginHorizontal: 16, marginTop: 14 },
  page: { flex: 1 },
  hidden: { display: 'none' },
});
