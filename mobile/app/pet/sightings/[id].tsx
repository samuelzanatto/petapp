import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/contexts/theme';
import { api } from '@/services/api';
import EmptyState from '@/components/EmptyState';

export default function PetSightingsScreen() {
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();
  const alertId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sightings, setSightings] = useState<any[]>([]);
  const [petAlertDetails, setPetAlertDetails] = useState<any>(null);
  
  // Carregar avistamentos do pet
  const loadSightings = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    
    try {
      // Carregar detalhes do alerta
      const alertResponse = await api.get(`/alerts/lost/${alertId}`);
      setPetAlertDetails(alertResponse);
      
      // Carregar avistamentos
      const sightingsResponse = await api.get(`/alerts/lost/${alertId}/sightings`);
      if (sightingsResponse && Array.isArray(sightingsResponse)) {
        // Ordenar com os "encontrados" primeiro, depois por data (mais recentes primeiro)
        const sortedSightings = sightingsResponse.sort((a, b) => {
          // Primeiro critério: hasFoundPet (true vem primeiro)
          if (a.hasFoundPet && !b.hasFoundPet) return -1;
          if (!a.hasFoundPet && b.hasFoundPet) return 1;
          
          // Segundo critério: data (mais recente primeiro)
          return new Date(b.sightedAt).getTime() - new Date(a.sightedAt).getTime();
        });
        
        setSightings(sortedSightings);
      } else {
        setSightings([]);
      }
    } catch (error) {
      console.error('Erro ao carregar avistamentos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os avistamentos. Tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Carregar dados quando a tela for montada
  useEffect(() => {
    loadSightings();
  }, [alertId]);
  
  // Função para atualizar os dados ao puxar para baixo
  const handleRefresh = () => {
    loadSightings(true);
  };
  
  // Função para contatar o usuário que reportou ter encontrado o pet
  const handleContactReporter = (sightingId: string, reporterId: string) => {
    // Navegar para a tela de chat ou iniciar um chat com o usuário
    router.push(`/chat/sighting/${sightingId}`);
  };
  
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <ThemedText style={{ marginTop: 16 }}>Carregando avistamentos...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          {petAlertDetails?.pet?.name ? `Avistamentos de ${petAlertDetails.pet.name}` : 'Avistamentos'}
        </ThemedText>
        <View style={{ width: 24 }} /> {/* Espaço para balancear o header */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});
