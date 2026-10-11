import InkEraser from '@expo/material-symbols/ink_eraser.xml';
import InkHighlighter from '@expo/material-symbols/ink_highlighter.xml';
import InkMarker from '@expo/material-symbols/ink_marker.xml';
import InkPen from '@expo/material-symbols/ink_pen.xml';
import Share from '@expo/material-symbols/share.xml';
import {
  HorizontalFloatingToolbar,
  Host,
  Icon,
  IconToggleButton,
  Row,
  Shape,
  Slider,
  Surface,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth, padding, size, testID, weight } from '@expo/ui/jetpack-compose/modifiers';
import { StyleSheet, View } from 'react-native';
import { COLORS, type DockProps, SIZE_RANGE, TOOLS } from './controls';
import { useTheme } from './theme';

const ICONS = { pen: InkPen, marker: InkMarker, highlighter: InkHighlighter, eraser: InkEraser };
const ROUND = { topStart: 28, topEnd: 28, bottomStart: 28, bottomEnd: 28 };

export function Dock(props: DockProps) {
  const theme = useTheme();
  return (
    <View style={styles.dock}>
      <Host matchContents={{ vertical: true }} style={styles.palette}>
        <Surface
          color={theme.surface}
          shape={Shape.RoundedCorner({ cornerRadii: ROUND })}
          modifiers={[fillMaxWidth()]}
        >
          <Row
            verticalAlignment="center"
            horizontalArrangement={{ spacedBy: 10 }}
            modifiers={[fillMaxWidth(), padding(16, 10, 12, 10)]}
          >
            {COLORS.map((swatch) => (
              <Surface
                key={swatch.value}
                color={swatch.value}
                shape={Shape.Circle({ radius: 1 })}
                border={
                  props.color === swatch.value ? { width: 3, color: theme.accent } : undefined
                }
                onClick={() => props.onColor(swatch.value)}
                modifiers={[size(28, 28)]}
              />
            ))}
            <Slider
              value={props.size}
              min={SIZE_RANGE.min}
              max={SIZE_RANGE.max}
              onValueChange={props.onSize}
              modifiers={[weight(1)]}
            />
          </Row>
        </Surface>
      </Host>
      <Host matchContents>
        <HorizontalFloatingToolbar variant="vibrant">
          {TOOLS.map((item) => (
            <IconToggleButton
              key={item.id}
              checked={props.tool === item.id}
              onCheckedChange={() => props.onTool(item.id)}
              modifiers={[testID(item.testID)]}
            >
              <Icon source={ICONS[item.id]} contentDescription={item.label} />
            </IconToggleButton>
          ))}
          <HorizontalFloatingToolbar.FloatingActionButton onPress={props.onExport}>
            <Icon source={Share} contentDescription="Export" />
          </HorizontalFloatingToolbar.FloatingActionButton>
        </HorizontalFloatingToolbar>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { alignItems: 'center', gap: 12, marginTop: 12, marginHorizontal: 16 },
  palette: { alignSelf: 'stretch' },
});
