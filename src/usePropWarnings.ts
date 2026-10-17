import { useEffect } from 'react';
import { processColor } from 'react-native';
import { propWarnings } from './propWarnings';
import type { InkCanvasProps } from './types';

export function usePropWarnings(props: Pick<InkCanvasProps, 'brush' | 'background'>): void {
  const warnings = __DEV__
    ? propWarnings(props, (color) => processColor(color) != null).join('\n')
    : '';
  useEffect(() => {
    if (!warnings) return;
    for (const warning of warnings.split('\n')) console.warn(`react-native-inkpad: ${warning}`);
  }, [warnings]);
}
