import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import SignatureCanvas from 'react-native-inkpad/signature-canvas';

export function AdapterScreen() {
  const [status, setStatus] = useState('waiting');

  return (
    <View style={styles.root}>
      <SignatureCanvas
        testID="signature-pad"
        style={styles.pad}
        descriptionText="Sign above"
        trimWhitespace
        onOK={(signature) => setStatus(`ok: ${signature.slice(0, 22)}`)}
        onEmpty={() => setStatus('empty')}
      />
      <Text testID="adapter-status">{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 12 },
  pad: { height: 320, flex: 0, borderWidth: 1, borderColor: '#CCCCCC' },
});
