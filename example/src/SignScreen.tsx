import { Host, Switch } from '@expo/ui';
import { type ReactNode, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import SignatureCanvas from 'react-native-inkpad/signature-canvas';
import { type Theme, useTheme } from './theme';

const WAITING = 'Waiting for a signature';

// Enough for one line; the full data URL would also become one huge accessibility label.
const DATA_PREVIEW_CHARS = 64;

export function SignScreen() {
  const theme = useTheme();
  const [undamaged, setUndamaged] = useState(true);
  const [status, setStatus] = useState(WAITING);
  const [signature, setSignature] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Heading theme={theme}>Delivery</Heading>
      <View style={[styles.group, { backgroundColor: theme.card }]}>
        <Row theme={theme} label="Order">
          <Text style={[styles.value, { color: theme.secondaryText }]}>#4827</Text>
        </Row>
        <Row theme={theme} label="Recipient" divider>
          <Text style={[styles.value, { color: theme.text }]}>SectionTN</Text>
        </Row>
        <Row theme={theme} label="Arrived undamaged" divider>
          <Host matchContents>
            <Switch value={undamaged} onValueChange={setUndamaged} />
          </Host>
        </Row>
      </View>
      <Heading theme={theme}>Signature</Heading>
      <View style={styles.group}>
        <SignatureCanvas
          testID="signature-pad"
          style={styles.pad}
          penColor="#1A2B4C"
          descriptionText="Sign above"
          trimWhitespace
          onOK={(data) => {
            setSignature(data);
            setStatus('Confirmed');
          }}
          onEmpty={() => {
            setSignature(null);
            setStatus('Sign above first');
          }}
          onClear={() => {
            setSignature(null);
            setStatus(WAITING);
          }}
        />
      </View>
      <Text style={[styles.note, { color: theme.secondaryText }]}>
        This pad is react-native-inkpad/signature-canvas, with the props of
        react-native-signature-canvas.
      </Text>
      <View style={[styles.group, styles.result, { backgroundColor: theme.card }]}>
        {signature ? (
          <Image source={{ uri: signature }} style={styles.thumb} resizeMode="contain" />
        ) : null}
        <View style={styles.resultText}>
          <Text testID="adapter-status" style={[styles.status, { color: theme.text }]}>
            {status}
          </Text>
          {signature ? (
            <Text
              testID="adapter-data"
              numberOfLines={1}
              style={[styles.data, { color: theme.secondaryText }]}
            >
              {signature.slice(0, DATA_PREVIEW_CHARS)}
            </Text>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function Heading({ theme, children }: { theme: Theme; children: string }) {
  return <Text style={[styles.heading, { color: theme.secondaryText }]}>{children}</Text>;
}

function Row({
  theme,
  label,
  divider,
  children,
}: {
  theme: Theme;
  label: string;
  divider?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.row, divider && { borderTopColor: theme.separator, ...styles.divider }]}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 18 },
  heading: {
    marginHorizontal: 16,
    marginBottom: 6,
    fontSize: 13,
    textTransform: Platform.OS === 'ios' ? 'uppercase' : 'none',
  },
  group: { marginBottom: 22, borderRadius: Platform.OS === 'ios' ? 26 : 24, overflow: 'hidden' },
  row: {
    minHeight: 50,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 17 },
  value: { fontSize: 17 },
  pad: { height: 230, flex: 0 },
  note: { marginTop: -12, marginBottom: 22, marginHorizontal: 16, fontSize: 13 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  thumb: { width: 116, height: 58, borderRadius: 10, backgroundColor: '#FFFFFF' },
  resultText: { flex: 1, gap: 2 },
  status: { fontSize: 15, fontWeight: '600' },
  data: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 11 },
});
