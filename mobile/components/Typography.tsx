import React from 'react';
import { StyleSheet, StyleProp, TextStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { textStyles } from '@/utils/styleUtils';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/theme';

type TextBaseProps = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
  numberOfLines?: number;
};

/**
 * Título principal (H1) - Texto grande, negrito
 */
export const H1 = ({ children, style, color, ...props }: TextBaseProps) => {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  
  return (
    <ThemedText
      weight="bold"
      style={[
        { 
          fontSize: 28,
          lineHeight: 34,
          marginBottom: 8,
          color: color || colors.text 
        },
        style
      ]}
      {...props}
    >
      {children}
    </ThemedText>
  );
};

/**
 * Subtítulo (H2) - Texto médio, semi-negrito
 */
export const H2 = ({ children, style, color, ...props }: TextBaseProps) => {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  
  return (
    <ThemedText
      weight="semiBold"
      style={[
        { 
          fontSize: 22,
          lineHeight: 28,
          marginBottom: 6,
          color: color || colors.text
        },
        style
      ]}
      {...props}
    >
      {children}
    </ThemedText>
  );
};

/**
 * Título de seção (H3) - Texto médio-pequeno, semi-negrito
 */
export const H3 = ({ children, style, color, ...props }: TextBaseProps) => {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  
  return (
    <ThemedText
      weight="semiBold"
      style={[
        { 
          fontSize: 18,
          lineHeight: 24,
          marginBottom: 4,
          color: color || colors.text
        },
        style
      ]}
      {...props}
    >
      {children}
    </ThemedText>
  );
};

/**
 * Texto de parágrafo normal
 */
export const Body = ({ children, style, color, ...props }: TextBaseProps) => {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  
  return (
    <ThemedText
      style={[
        { 
          fontSize: 16,
          lineHeight: 22,
          color: color || colors.text
        },
        style
      ]}
      {...props}
    >
      {children}
    </ThemedText>
  );
};

/**
 * Texto secundário, menor e mais leve
 */
export const Caption = ({ children, style, color, ...props }: TextBaseProps) => {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  
  return (
    <ThemedText
      weight="light"
      style={[
        { 
          fontSize: 14,
          lineHeight: 18,
          color: color || colors.textSecondary
        },
        style
      ]}
      {...props}
    >
      {children}
    </ThemedText>
  );
};

/**
 * Texto muito pequeno para informações terciárias
 */
export const Small = ({ children, style, color, ...props }: TextBaseProps) => {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  
  return (
    <ThemedText
      weight="light"
      style={[
        { 
          fontSize: 12,
          lineHeight: 16,
          color: color || colors.textTertiary
        },
        style
      ]}
      {...props}
    >
      {children}
    </ThemedText>
  );
};

/**
 * Texto com ênfase (negrito)
 */
export const Bold = ({ children, style, color, ...props }: TextBaseProps) => {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  
  return (
    <ThemedText
      weight="bold"
      style={[
        { 
          color: color || colors.text
        },
        style
      ]}
      {...props}
    >
      {children}
    </ThemedText>
  );
};

/**
 * Texto de link clicável
 */
export const Link = ({ children, style, color, ...props }: TextBaseProps) => {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  
  return (
    <ThemedText
      weight="medium"
      style={[
        { 
          color: color || colors.accent,
          textDecorationLine: 'underline'
        },
        style
      ]}
      {...props}
    >
      {children}
    </ThemedText>
  );
};

// Exporte todos os componentes em um único objeto para facilitar importações
export const Typography = {
  H1,
  H2,
  H3,
  Body,
  Caption,
  Small,
  Bold,
  Link
};