import { Button, Circle, Host, HStack, Slider, Spacer, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  foregroundStyle,
  frame,
  glassEffect,
  labelStyle,
  onTapGesture,
  padding,
  strokeBorder,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';
import { COLORS, type DockProps, SIZE_RANGE, TOOLS } from './controls';
import { useTheme } from './theme';

const SYMBOLS = {
  pen: 'pencil.tip',
  marker: 'paintbrush.pointed',
  highlighter: 'highlighter',
  eraser: 'eraser',
} as const;

export function Dock(props: DockProps) {
  const theme = useTheme();
  return (
    <Host matchContents={{ vertical: true }} style={styles.host}>
      <VStack
        spacing={6}
        modifiers={[
          padding({ horizontal: 12, vertical: 10 }),
          glassEffect({ shape: 'roundedRectangle', cornerRadius: 32 }),
        ]}
      >
        <HStack spacing={2}>
          {TOOLS.map((item) => {
            const selected = props.tool === item.id;
            return (
              <Button
                key={item.id}
                label={item.label}
                systemImage={SYMBOLS[item.id]}
                testID={item.testID}
                onPress={() => props.onTool(item.id)}
                modifiers={[
                  labelStyle('iconOnly'),
                  buttonBorderShape('circle'),
                  controlSize('large'),
                  buttonStyle(selected ? 'bordered' : 'borderless'),
                  tint(selected ? theme.accent : theme.text),
                ]}
              />
            );
          })}
          <Spacer />
          <Button
            label="Export"
            systemImage="square.and.arrow.up"
            testID="export"
            onPress={props.onExport}
            modifiers={[buttonStyle('glassProminent'), controlSize('large')]}
          />
        </HStack>
        <HStack spacing={10} modifiers={[padding({ leading: 6 })]}>
          {COLORS.map((swatch) => (
            <ZStack
              key={swatch.value}
              modifiers={[
                frame({ width: 32, height: 32 }),
                onTapGesture(() => props.onColor(swatch.value)),
                accessibilityLabel(swatch.name),
              ]}
            >
              <Circle
                modifiers={[foregroundStyle(swatch.value), frame({ width: 24, height: 24 })]}
              />
              {props.color === swatch.value ? (
                <Circle
                  modifiers={[
                    strokeBorder({
                      color: theme.accent,
                      style: { lineWidth: 2.5 },
                      shape: 'circle',
                    }),
                    frame({ width: 32, height: 32 }),
                  ]}
                />
              ) : null}
            </ZStack>
          ))}
          <Slider
            value={props.size}
            min={SIZE_RANGE.min}
            max={SIZE_RANGE.max}
            onValueChange={props.onSize}
            modifiers={[tint(theme.accent)]}
          />
        </HStack>
      </VStack>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { marginHorizontal: 12, marginTop: 12 },
});
