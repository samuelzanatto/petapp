import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedCard } from './ThemedCard';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/contexts/theme';

interface StatsCardProps {
  icon: string;
  value: string;
  label: string;
  onPress?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, value, label, onPress }) => {
  const { colors } = useTheme();
  
  const Container = onPress ? TouchableOpacity : View;
  
  return (
    <Container onPress={onPress} style={styles.container}>
      <ThemedCard style={styles.card}>
        <Ionicons name={icon as any} size={24} color={colors.primary} style={styles.icon} />
        <ThemedText style={styles.value}>{value}</ThemedText>
        <ThemedText style={styles.label}>{label}</ThemedText>
      </ThemedCard>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 4,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  icon: {
    marginBottom: 8,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default StatsCard;