import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/contexts/theme';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  message: string;
  buttonTitle?: string;
  showButton?: boolean;
  onButtonPress?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon = 'alert-circle-outline',
  title, 
  message, 
  buttonTitle = 'Tentar novamente',
  showButton = true,
  onButtonPress 
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={70} color={colors.textSecondary} style={styles.icon} />
      
      {title && (
        <ThemedText style={styles.title}>
          {title}
        </ThemedText>
      )}
      
      <ThemedText style={styles.message}>
        {message || 'Nenhum dado disponível.'}
      </ThemedText>
      
      {showButton && onButtonPress && (
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.accent }]} 
          onPress={onButtonPress}
        >
          <ThemedText style={styles.buttonText}>
            {buttonTitle}
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EmptyState;