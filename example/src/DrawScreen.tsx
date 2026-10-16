import { type RefObject, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { InkCanvas, type InkCanvasRef, type InkState } from 'react-native-inkpad';
import { brushFor, COLORS, type Tool } from './controls';
import { Dock } from './Dock';
import { ExportSheet } from './ExportSheet';
import { useTheme } from './theme';

type Props = {
  canvas: RefObject<InkCanvasRef | null>;
  paper: boolean;
  pencilOnly: boolean;
  onChange(state: InkState): void;
  onError(code: string): void;
};

const PAPER = require('../assets/paper.png');

export function DrawScreen({ canvas, paper, pencilOnly, onChange, onError }: Props) {
  const theme = useTheme();
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]?.value ?? '#000000');
  const [size, setSize] = useState(4);
  const [exporting, setExporting] = useState(false);

  return (
    <View style={styles.root}>
      <InkCanvas
        ref={canvas}
        testID="canvas"
        tool={tool === 'eraser' ? 'erase' : 'draw'}
        brush={brushFor(tool, color, size)}
        background={{ color: '#FFFFFF', image: paper ? PAPER : undefined, fit: 'cover' }}
        inputMode={pencilOnly ? 'stylus' : 'any'}
        onError={(error) => onError(error.code)}
        style={[styles.canvas, { borderColor: theme.separator }]}
        onChange={onChange}
      />
      <Dock
        tool={tool}
        onTool={setTool}
        color={color}
        onColor={setColor}
        size={size}
        onSize={setSize}
        onExport={() => setExporting(true)}
      />
      <ExportSheet canvas={canvas} open={exporting} onClose={() => setExporting(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 14 },
  canvas: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
