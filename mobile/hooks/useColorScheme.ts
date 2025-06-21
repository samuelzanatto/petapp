import { useTheme } from '../contexts/theme';

export function useColorScheme() {
  const { colorScheme } = useTheme();
  return colorScheme;
}