import { Button, Host, HStack } from '@expo/ui/swift-ui';
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';
import type { ToolbarProps } from './controls';

const ICON_BUTTON = [
  labelStyle('iconOnly'),
  buttonStyle('glass'),
  buttonBorderShape('circle'),
  controlSize('large'),
];

export function Toolbar(props: ToolbarProps) {
  return (
    <View style={styles.bar}>
      {props.visible ? (
        <>
          <Host matchContents>
            <Button
              label="Sample"
              systemImage="sparkles"
              testID="load-sample"
              onPress={props.onSample}
              modifiers={[buttonStyle('glass'), controlSize('large')]}
            />
          </Host>
          <Host matchContents>
            <HStack spacing={8}>
              <Button
                label="Undo"
                systemImage="arrow.uturn.backward"
                testID="undo"
                onPress={props.onUndo}
                modifiers={[...ICON_BUTTON, disabled(!props.canUndo)]}
              />
              <Button
                label="Redo"
                systemImage="arrow.uturn.forward"
                testID="redo"
                onPress={props.onRedo}
                modifiers={[...ICON_BUTTON, disabled(!props.canRedo)]}
              />
              <Button
                label="Clear"
                systemImage="trash"
                testID="clear"
                onPress={props.onClear}
                modifiers={[...ICON_BUTTON, disabled(!props.canClear)]}
              />
            </HStack>
          </Host>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
