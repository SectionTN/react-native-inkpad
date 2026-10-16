import Draw from '@expo/material-symbols/draw.xml';
import Notes from '@expo/material-symbols/notes.xml';
import { Host, Icon, IconToggleButton, Row } from '@expo/ui/jetpack-compose';
import { testID } from '@expo/ui/jetpack-compose/modifiers';
import type { ModesProps } from './controls';

export function Modes(props: ModesProps) {
  if (!props.visible) return null;
  return (
    <Host matchContents>
      <Row>
        <IconToggleButton
          checked={props.paper}
          onCheckedChange={props.onPaper}
          modifiers={[testID('background-toggle')]}
        >
          <Icon source={Notes} contentDescription="Paper" />
        </IconToggleButton>
        <IconToggleButton
          checked={props.pencilOnly}
          onCheckedChange={props.onPencilOnly}
          modifiers={[testID('stylus-toggle')]}
        >
          <Icon source={Draw} contentDescription="Pencil only" />
        </IconToggleButton>
      </Row>
    </Host>
  );
}
