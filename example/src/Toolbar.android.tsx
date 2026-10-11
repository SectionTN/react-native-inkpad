import Delete from '@expo/material-symbols/delete.xml';
import Redo from '@expo/material-symbols/redo.xml';
import Undo from '@expo/material-symbols/undo.xml';
import WandStars from '@expo/material-symbols/wand_stars.xml';
import { Host, Icon, IconButton, Row } from '@expo/ui/jetpack-compose';
import { testID } from '@expo/ui/jetpack-compose/modifiers';
import { StyleSheet, View } from 'react-native';
import type { ToolbarProps } from './controls';

export function Toolbar(props: ToolbarProps) {
  return (
    <View style={styles.bar}>
      {props.visible ? (
        <Host matchContents>
          <Row>
            <IconButton onClick={props.onSample} modifiers={[testID('load-sample')]}>
              <Icon source={WandStars} contentDescription="Sample" />
            </IconButton>
            <IconButton onClick={props.onUndo} enabled={props.canUndo} modifiers={[testID('undo')]}>
              <Icon source={Undo} contentDescription="Undo" />
            </IconButton>
            <IconButton onClick={props.onRedo} enabled={props.canRedo} modifiers={[testID('redo')]}>
              <Icon source={Redo} contentDescription="Redo" />
            </IconButton>
            <IconButton
              onClick={props.onClear}
              enabled={props.canClear}
              modifiers={[testID('clear')]}
            >
              <Icon source={Delete} contentDescription="Clear" />
            </IconButton>
          </Row>
        </Host>
      ) : null}
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
});
