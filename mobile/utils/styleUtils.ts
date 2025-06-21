import { TextStyle } from 'react-native';
import { Typography } from '@/constants/Fonts';
import { Colors } from '@/constants/Colors';

/**
 * Utilitário para criar estilos de texto consistentes no aplicativo
 */
export const createTextStyle = (
  options: {
    size?: keyof typeof Typography.sizes;
    weight?: keyof typeof Typography.weights;
    color?: string;
    lineHeight?: number;
  } = {}
): TextStyle => {
  const { 
    size = 'md',
    weight = 'regular',
    color,
    lineHeight
  } = options;

  return {
    fontSize: Typography.sizes[size],
    fontFamily: Typography.weights[weight],
    lineHeight: lineHeight || Typography.sizes[size] * Typography.lineHeights.normal,
    color
  };
};

/**
 * Estilos pré-definidos para uso comum no aplicativo
 */
export const textStyles = {
  // Estilos para títulos
  title: (color?: string): TextStyle => createTextStyle({
    size: 'xxl',
    weight: 'bold',
    color,
    lineHeight: Typography.sizes.xxl * Typography.lineHeights.tight
  }),
  
  // Estilos para subtítulos
  subtitle: (color?: string): TextStyle => createTextStyle({
    size: 'lg',
    weight: 'semiBold',
    color,
    lineHeight: Typography.sizes.lg * Typography.lineHeights.normal
  }),
  
  // Estilo para texto normal
  body: (color?: string): TextStyle => createTextStyle({
    size: 'md',
    weight: 'regular',
    color
  }),
  
  // Estilo para texto pequeno
  small: (color?: string): TextStyle => createTextStyle({
    size: 'sm',
    weight: 'light',
    color
  }),
  
  // Estilo para texto em negrito
  bold: (size: keyof typeof Typography.sizes = 'md', color?: string): TextStyle => createTextStyle({
    size,
    weight: 'bold',
    color
  }),
  
  // Estilo para texto secundário
  secondary: (color?: string): TextStyle => createTextStyle({
    size: 'md',
    weight: 'regular',
    color: color || 'textSecondary'
  }),
  
  // Estilo para texto de link
  link: (color?: string): TextStyle => ({
    ...createTextStyle({
      size: 'md',
      weight: 'medium',
      color: color || 'primary'
    }),
    textDecorationLine: 'underline'
  })
};

/**
 * Função auxiliar para obter cores baseadas no tema atual
 */
export const getThemeColor = (colorName: keyof typeof Colors.light, isDark: boolean): string => {
  return isDark ? Colors.dark[colorName] : Colors.light[colorName];
};