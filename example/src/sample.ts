import type { InkDocument } from 'react-native-inkpad';

export const sample: InkDocument = {
  version: 1,
  size: { width: 320, height: 320 },
  strokes: [
    {
      brush: { type: 'pen', color: '#1A1A1AFF', size: 4 },
      input: 'touch',
      points: [
        40, 160, 0, -1, -1, -1, 120, 120, 40, -1, -1, -1, 200, 200, 80, -1, -1, -1, 280, 160, 120,
        -1, -1, -1,
      ],
    },
    {
      brush: { type: 'highlighter', color: '#FFE600FF', size: 16 },
      input: 'touch',
      points: [40, 240, 0, -1, -1, -1, 280, 240, 200, -1, -1, -1],
    },
  ],
};
