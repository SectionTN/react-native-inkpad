import { Platform, useColorScheme } from 'react-native';

const palettes = {
  ios: {
    light: {
      background: '#F2F2F7',
      card: '#FFFFFF',
      text: '#000000',
      secondaryText: '#3C3C4399',
      separator: '#3C3C4329',
      accent: '#007AFF',
      surface: '#E9E9EE',
    },
    dark: {
      background: '#000000',
      card: '#1C1C1E',
      text: '#FFFFFF',
      secondaryText: '#EBEBF599',
      separator: '#54545899',
      accent: '#0A84FF',
      surface: '#2C2C2E',
    },
  },
  android: {
    light: {
      background: '#F8FAFD',
      card: '#FFFFFF',
      text: '#1F1F1F',
      secondaryText: '#444746',
      separator: '#C4C7C5',
      accent: '#0B57D0',
      surface: '#E9EEF6',
    },
    dark: {
      background: '#131314',
      card: '#1E1F20',
      text: '#E3E3E3',
      secondaryText: '#C4C7C5',
      separator: '#444746',
      accent: '#A8C7FA',
      surface: '#282A2C',
    },
  },
};

export type Theme = typeof palettes.ios.light;

export function useTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return palettes[Platform.OS === 'ios' ? 'ios' : 'android'][scheme];
}
