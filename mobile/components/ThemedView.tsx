import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/theme';
import { Colors } from '@/constants/Colors';

interface ThemedViewProps extends ViewProps {
  darkBackground?: string;
  lightBackground?: string;
}

export const ThemedView: React.FC<ThemedViewProps> = ({ 
  style, 
  darkBackground = Colors.dark.background,
  lightBackground = Colors.light.background,
  children, 
  ...props 
}) => {
  const { isDark } = useTheme();
  
  return (
    <View
      style={[
        { backgroundColor: isDark ? darkBackground : lightBackground },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

// Um componente específico para telas
export const ThemedScreen: React.FC<ThemedViewProps> = (props) => (
  <SafeAreaView 
    style={[
      styles.screen, 
      { backgroundColor: props.darkBackground ? 
          (props.darkBackground) : 
          (props.lightBackground ? props.lightBackground : Colors.dark.background) 
      },
      props.style
    ]} 
  >
    <ThemedView 
      style={{ flex: 1 }}
      darkBackground={props.darkBackground}
      lightBackground={props.lightBackground}
      {...props}
    />
  </SafeAreaView>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  }
});