import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, type DockProps, SIZE_RANGE, TOOLS } from './controls';
import { useTheme } from './theme';

export function Dock(props: DockProps) {
  const theme = useTheme();
  const size = Math.round(props.size);
  const step = (delta: number) =>
    props.onSize(Math.min(SIZE_RANGE.max, Math.max(SIZE_RANGE.min, size + delta)));
  return (
    <View style={styles.dock}>
      <View style={[styles.row, styles.palette, { backgroundColor: theme.surface }]}>
        {COLORS.map((swatch) => (
          <Pressable
            key={swatch.value}
            role="button"
            aria-label={swatch.name}
            aria-selected={props.color === swatch.value}
            onPress={() => props.onColor(swatch.value)}
            style={[
              styles.swatch,
              { backgroundColor: swatch.value },
              props.color === swatch.value && { borderColor: theme.accent },
            ]}
          />
        ))}
        <View style={[styles.row, styles.size]}>
          <Pressable
            role="button"
            aria-label="Thinner"
            disabled={size <= SIZE_RANGE.min}
            onPress={() => step(-1)}
            style={({ pressed }) => [styles.step, pressed && styles.pressed]}
          >
            <Text style={[styles.label, { color: theme.text }]}>-</Text>
          </Pressable>
          <Text style={[styles.label, styles.value, { color: theme.text }]}>{size}</Text>
          <Pressable
            role="button"
            aria-label="Thicker"
            disabled={size >= SIZE_RANGE.max}
            onPress={() => step(1)}
            style={({ pressed }) => [styles.step, pressed && styles.pressed]}
          >
            <Text style={[styles.label, { color: theme.text }]}>+</Text>
          </Pressable>
        </View>
      </View>
      <View style={[styles.row, styles.tools, { backgroundColor: theme.surface }]}>
        {TOOLS.map((item) => {
          const selected = props.tool === item.id;
          return (
            <Pressable
              key={item.id}
              testID={item.testID}
              role="button"
              aria-selected={selected}
              onPress={() => props.onTool(item.id)}
              style={[styles.tool, selected && { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.label, { color: selected ? theme.card : theme.text }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          testID="export"
          role="button"
          aria-label="Export"
          onPress={props.onExport}
          style={[styles.tool, { backgroundColor: theme.accent }]}
        >
          <Text style={[styles.label, { color: theme.card }]}>Export</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { alignItems: 'center', gap: 12, marginTop: 12, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  palette: {
    alignSelf: 'stretch',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 28,
  },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: 'transparent' },
  size: { flex: 1, justifyContent: 'flex-end', gap: 4 },
  step: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
  value: { minWidth: 20, textAlign: 'center' },
  tools: { gap: 4, padding: 6, borderRadius: 28 },
  tool: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22 },
  label: { fontSize: 15, fontWeight: '500' },
});
