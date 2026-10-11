import type { Brush, InkDocument } from 'react-native-inkpad';
import data from './sample.json';

export type Tool = 'pen' | 'marker' | 'highlighter' | 'eraser';

export const TOOLS: { id: Tool; label: string; testID: string }[] = [
  { id: 'pen', label: 'Pen', testID: 'tool-pen' },
  { id: 'marker', label: 'Marker', testID: 'tool-marker' },
  { id: 'highlighter', label: 'Highlighter', testID: 'tool-highlighter' },
  { id: 'eraser', label: 'Eraser', testID: 'eraser' },
];

export const COLORS = [
  { name: 'Black', value: '#1C1C1E' },
  { name: 'Blue', value: '#2F6FED' },
  { name: 'Red', value: '#E5484D' },
  { name: 'Orange', value: '#F76B15' },
  { name: 'Yellow', value: '#FFD60A' },
  { name: 'Purple', value: '#8E4EC6' },
];

export const SIZE_RANGE = { min: 1, max: 10 };

export const sample = data as InkDocument;

export function brushFor(tool: Tool, color: string, size: number): Brush {
  if (tool === 'marker') return { type: 'marker', color, size: size * 1.6 };
  if (tool === 'highlighter') return { type: 'highlighter', color, size: size * 5 };
  return { type: 'pen', color, size };
}

export type ToolbarProps = {
  visible: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canClear: boolean;
  onSample(): void;
  onUndo(): void;
  onRedo(): void;
  onClear(): void;
};

export type DockProps = {
  tool: Tool;
  onTool(tool: Tool): void;
  color: string;
  onColor(color: string): void;
  size: number;
  onSize(size: number): void;
  onExport(): void;
};
