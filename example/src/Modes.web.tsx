import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ModesProps } from './controls';
import { useTheme } from './theme';

export function Modes(props: ModesProps) {
  const theme = useTheme();
  if (!props.visible) return null;
  const toggles = [
    { label: 'Paper', testID: 'background-toggle', on: props.paper, onPress: props.onPaper },
    {
      label: 'Pencil only',
      testID: 'stylus-toggle',
      on: props.pencilOnly,
      onPress: props.onPencilOnly,
    },
  ];
  return (
    <View style={styles.row}>
      {toggles.map((toggle) => (
        <Pressable
          key={toggle.testID}
          testID={toggle.testID}
          role="button"
          aria-pressed={toggle.on}
          onPress={toggle.onPress}
          style={({ pressed }) => [
            styles.toggle,
            { borderColor: theme.accent },
            toggle.on && { backgroundColor: theme.accent },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.label, { color: toggle.on ? theme.card : theme.accent }]}>
            {toggle.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  toggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  pressed: { opacity: 0.5 },
  label: { fontSize: 14, fontWeight: '500' },
});
