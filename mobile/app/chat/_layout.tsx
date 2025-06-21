import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/theme';
import { Colors } from '@/constants/Colors';

export default function ChatLayout() {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Mensagens',
          headerTitleAlign: 'center',
        }}
      />
    </Stack>
  );
}