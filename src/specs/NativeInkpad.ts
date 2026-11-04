import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  renderImage(documentJson: string, optionsJson: string): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('Inkpad');
