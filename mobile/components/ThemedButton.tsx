import { StyleSheet, Text, TouchableOpacity, ViewStyle, TextStyle, ActivityIndicator } from 'react-native'
import React from 'react'
import { Colors } from '@/constants/Colors'
import { useColorScheme } from '@/hooks/useColorScheme'
import { Typography } from '@/constants/Fonts'

type ButtonProps = {
  title: string
  onPress: () => void
  style?: ViewStyle
  textStyle?: TextStyle
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
}

const ThemedButton = ({ 
  title, 
  onPress, 
  style, 
  textStyle, 
  disabled = false, 
  loading = false,
  variant = 'primary'
}: ButtonProps) => {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme]

  // Estilos base para cada variante
  const buttonStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: colors.accent,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: colors.accent,
      borderWidth: 0,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.accent,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    }
  }

  // Estilos base de texto para cada variante
  const textStyles: Record<string, TextStyle> = {
    primary: {
      color: colors.buttonText,
      fontFamily: Typography.weights.semiBold,
    },
    secondary: {
      color: colors.buttonText,
      fontFamily: Typography.weights.medium,
    },
    outline: {
      color: colors.accent,
      fontFamily: Typography.weights.medium,
    },
    ghost: {
      color: colors.accent,
      fontFamily: Typography.weights.medium,
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        buttonStyles[variant],
        disabled && { backgroundColor: colors.buttonDisabled, shadowOpacity: 0 },
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textStyles[variant].color} />
      ) : (
        <Text
          style={[
            styles.text,
            textStyles[variant],
            disabled && { color: colorScheme === 'light' ? '#A8A8A8' : '#666666' },
            textStyle
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  )
}

export default ThemedButton

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  text: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
  }
})