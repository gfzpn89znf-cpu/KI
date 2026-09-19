import { useColorScheme } from 'react-native';

export interface Theme {
  dark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textDim: string;
  accent: string;
  accentText: string;
  danger: string;
  codeBg: string;
}

const DARK: Theme = {
  dark: true,
  bg: '#0B0D10',
  surface: '#14181D',
  surfaceAlt: '#1B212A',
  border: '#272E38',
  text: '#ECEFF3',
  textDim: '#93A0B0',
  accent: '#D97757',
  accentText: '#FFFFFF',
  danger: '#E5714F',
  codeBg: '#0F1318',
};

const LIGHT: Theme = {
  dark: false,
  bg: '#FAF9F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EFEC',
  border: '#E2DFDA',
  text: '#1B1917',
  textDim: '#6E6862',
  accent: '#C4633F',
  accentText: '#FFFFFF',
  danger: '#B4402A',
  codeBg: '#F3F1EE',
};

export function useTheme(): Theme {
  return useColorScheme() === 'light' ? LIGHT : DARK;
}

export const radius = { sm: 8, md: 14, lg: 20 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
