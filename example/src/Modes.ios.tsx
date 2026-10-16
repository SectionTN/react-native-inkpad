import { Button, Host, HStack } from '@expo/ui/swift-ui';
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';
import type { ModesProps } from './controls';

const toggle = (on: boolean) => [
  labelStyle('iconOnly'),
  buttonStyle(on ? 'glassProminent' : 'glass'),
  buttonBorderShape('circle'),
  controlSize('large'),
];

export function Modes(props: ModesProps) {
  if (!props.visible) return null;
  return (
    <Host matchContents>
      <HStack spacing={8}>
        <Button
          label="Paper"
          systemImage="doc.plaintext"
          testID="background-toggle"
          onPress={props.onPaper}
          modifiers={toggle(props.paper)}
        />
        <Button
          label="Pencil only"
          systemImage="pencil.tip"
          testID="stylus-toggle"
          onPress={props.onPencilOnly}
          modifiers={toggle(props.pencilOnly)}
        />
      </HStack>
    </Host>
  );
}
