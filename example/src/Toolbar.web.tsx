import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ToolbarProps } from './controls';
import { useTheme } from './theme';

export function Toolbar(props: ToolbarProps) {
  const theme = useTheme();
  const buttons = [
    { label: 'Sample', testID: 'load-sample', onPress: props.onSample, enabled: true },
    { label: 'Undo', testID: 'undo', onPress: props.onUndo, enabled: props.canUndo },
    { label: 'Redo', testID: 'redo', onPress: props.onRedo, enabled: props.canRedo },
    { label: 'Clear', testID: 'clear', onPress: props.onClear, enabled: props.canClear },
  ];
  return (
    <View style={styles.bar}>
      {props.visible
        ? buttons.map((button) => (
            <Pressable
              key={button.testID}
              testID={button.testID}
              role="button"
              disabled={!button.enabled}
              onPress={button.onPress}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            >
              <Text
                style={[
                  styles.label,
                  { color: button.enabled ? theme.accent : theme.secondaryText },
                ]}
              >
                {button.label}
              </Text>
            </Pressable>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  button: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  pressed: { opacity: 0.5 },
  label: { fontSize: 15, fontWeight: '500' },
});
