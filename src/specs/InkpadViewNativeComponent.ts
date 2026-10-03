import type * as React from 'react';
import type { CodegenTypes, ColorValue, HostComponent, ViewProps } from 'react-native';
import { codegenNativeCommands, codegenNativeComponent } from 'react-native';

type EmptyEvent = Readonly<{}>;

type ChangeEvent = Readonly<{
  strokeCount: CodegenTypes.Int32;
  canUndo: boolean;
  canRedo: boolean;
}>;

export interface NativeProps extends ViewProps {
  brushType?: CodegenTypes.WithDefault<'pen' | 'marker' | 'highlighter', 'pen'>;
  brushColor?: ColorValue;
  brushSize?: CodegenTypes.WithDefault<CodegenTypes.Float, 3>;
  tool?: CodegenTypes.WithDefault<'draw' | 'erase', 'draw'>;
  editable?: CodegenTypes.WithDefault<boolean, true>;
  canvasColor?: ColorValue;
  onInkStrokeStart?: CodegenTypes.DirectEventHandler<EmptyEvent>;
  onInkStrokeEnd?: CodegenTypes.DirectEventHandler<EmptyEvent>;
  onInkChange?: CodegenTypes.DirectEventHandler<ChangeEvent>;
}

interface NativeCommands {
  undo: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
  redo: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
  clear: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['undo', 'redo', 'clear'],
});

export default codegenNativeComponent<NativeProps>('InkpadView') as HostComponent<NativeProps>;
