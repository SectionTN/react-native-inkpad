import type { CodegenTypes, ColorValue, HostComponent, ViewProps } from 'react-native';
import { codegenNativeComponent } from 'react-native';

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
  editable?: CodegenTypes.WithDefault<boolean, true>;
  canvasColor?: ColorValue;
  onInkStrokeStart?: CodegenTypes.DirectEventHandler<EmptyEvent>;
  onInkStrokeEnd?: CodegenTypes.DirectEventHandler<EmptyEvent>;
  onInkChange?: CodegenTypes.DirectEventHandler<ChangeEvent>;
}

export default codegenNativeComponent<NativeProps>('InkpadView') as HostComponent<NativeProps>;
