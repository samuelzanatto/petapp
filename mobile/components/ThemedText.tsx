import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/theme';
import { Colors } from '@/constants/Colors';
import { FontFamily, Typography } from '@/constants/Fonts';

type TextType = 'default' | 'title' | 'subtitle' | 'secondary' | 'small' | 'link';

interface ThemedTextProps extends TextProps {
  type?: TextType;
  color?: string;
  weight?: 'light' | 'regular' | 'medium' | 'semiBold' | 'bold';
}

export const ThemedText: React.FC<ThemedTextProps> = ({ 
  style, 
  type = 'default',
  color,
  weight,
  children, 
  ...props 
}) => {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  
  const getTextStyle = () => {
    // Base style do tipo de texto
    const baseStyle = (() => {
      switch(type) {
        case 'title':
          return [styles.title, { color: color || colors.text }];
        case 'subtitle':
          return [styles.subtitle, { color: color || colors.textSecondary }];
        case 'secondary':
          return [styles.secondary, { color: color || colors.textSecondary }];
        case 'small':
          return [styles.small, { color: color || colors.textTertiary }];
        case 'link':
          return [styles.link, { color: color || colors.primary }];
        default:
          return [styles.default, { color: color || colors.text }];
      }
    })();
    
    // Se um peso específico foi passado, substitui o peso padrão
    if (weight) {
      return [...baseStyle, { fontFamily: Typography.weights[weight] }];
    }
    
    return baseStyle;
  };
  
  return (
    <Text
      style={[getTextStyle(), style]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  default: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * Typography.lineHeights.normal,
    fontFamily: FontFamily.regular,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    marginBottom: 6,
    lineHeight: Typography.sizes.xxl * Typography.lineHeights.tight,
    fontFamily: FontFamily.bold,
  },
  subtitle: {
    fontSize: Typography.sizes.lg,
    marginBottom: 5,
    lineHeight: Typography.sizes.lg * Typography.lineHeights.normal,
    fontFamily: FontFamily.semiBold,
  },
  secondary: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * Typography.lineHeights.normal,
    fontFamily: FontFamily.regular,
  },
  small: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
    fontFamily: FontFamily.light,
  },
  link: {
    fontSize: Typography.sizes.md,
    textDecorationLine: 'underline',
    lineHeight: Typography.sizes.md * Typography.lineHeights.normal,
    fontFamily: FontFamily.medium,
  },
});