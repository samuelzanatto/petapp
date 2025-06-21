import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, ColorSchemeName, useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';

type ThemeType = 'light' | 'dark' | 'system';
type ColorSchemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  colorScheme: ColorSchemeType;
  isDark: boolean;
  colors: typeof Colors.light | typeof Colors.dark;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useRNColorScheme() || 'light';
  const [theme, setThemeState] = useState<ThemeType>('system');
  const [colorScheme, setColorScheme] = useState<ColorSchemeType>(systemColorScheme as ColorSchemeType);

  // Carregar tema salvo ao iniciar
  useEffect(() => {
    loadTheme();
  }, []);

  // Atualizar esquema de cores quando o tema ou o esquema do sistema mudar
  useEffect(() => {
    updateColorScheme();
  }, [theme, systemColorScheme]);

  // Listener para mudanças no esquema de cores do sistema
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (theme === 'system') {
        setColorScheme(colorScheme as ColorSchemeType || 'light');
      }
    });

    return () => subscription.remove();
  }, [theme]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setThemeState(savedTheme as ThemeType);
      }
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
    }
  };

  const updateColorScheme = () => {
    if (theme === 'system') {
      setColorScheme(systemColorScheme as ColorSchemeType);
    } else {
      setColorScheme(theme as ColorSchemeType);
    }
  };

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = colorScheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const value = {
    theme,
    colorScheme,
    isDark,
    colors,
    setTheme,
    toggleTheme
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};