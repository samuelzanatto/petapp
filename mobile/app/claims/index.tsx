import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { useTheme } from '@/contexts/theme';
import { getUserClaims, getReceivedClaims } from '@/services/api';
import EmptyState from '@/components/EmptyState';

type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
type ClaimType = 'SENT' | 'RECEIVED';

type Claim = {
  id: string;
  status: ClaimStatus;
  createdAt: string;
  petName: string;
  petImage: string;
  userName: string;
  userImage: string | null;
  updatedAt: string;
};

export default function ClaimsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  
  // Estado da aplicação
  const [activeTab, setActiveTab] = useState<ClaimType>('SENT');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Funções de utilidade
  const getStatusColor = (status: ClaimStatus) => {
    switch (status) {
      case 'PENDING': return colors.primary; // Laranja primário
      case 'APPROVED': return '#4CAF50'; // Verde
      case 'REJECTED': return '#F44336'; // Vermelho
      case 'COMPLETED': return '#2196F3'; // Azul
      case 'CANCELLED': return '#9E9E9E'; // Cinza
      default: return '#9E9E9E';
    }
  };
  
  const getStatusText = (status: ClaimStatus) => {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'APPROVED': return 'Aprovado';
      case 'REJECTED': return 'Rejeitado';
      case 'COMPLETED': return 'Concluído';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  
  const fetchClaims = useCallback(async (type: ClaimType) => {
    try {
      setLoading(true);
      
      let claimsData;
      if (type === 'SENT') {
        claimsData = await getUserClaims();
      } else {
        claimsData = await getReceivedClaims();
      }
      
      console.log('Dados de reivindicações recebidos:', JSON.stringify(claimsData, null, 2));
      
      const formattedClaims = claimsData.map((claim: any) => {
        // Verificar se o objeto alert existe e tem as propriedades esperadas
        const alert = claim.alert || {};
        const petData = alert.pet || {};
        const alertUser = alert.user || {};
        const claimantData = claim.claimant || {};
        
        return {
          id: claim.id,
          status: claim.status,
          createdAt: claim.createdAt,
          updatedAt: claim.updatedAt || claim.createdAt,
          // Usar valores seguros com fallbacks
          petName: petData.name || 'Pet sem nome',
          petImage: petData.primaryImage || null,
          userName: type === 'SENT' ? alertUser.name || 'Usuário desconhecido' : claimantData.name || 'Usuário desconhecido',
          userImage: type === 'SENT' ? alertUser.profileImage || null : claimantData.profileImage || null
        };
      });
      
      setClaims(formattedClaims);
    } catch (error) {
      console.error('Erro ao carregar reivindicações:', error);
      Alert.alert('Erro', 'Não foi possível carregar suas reivindicações.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  useEffect(() => {
    fetchClaims(activeTab);
  }, [activeTab, fetchClaims]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchClaims(activeTab);
  };
  
  const switchTab = (tab: ClaimType) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };
  
  const renderClaimItem = ({ item }: { item: Claim }) => {
    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => router.push(`/claims/${item.id}`)}
        activeOpacity={0.7}
      >
        <ThemedCard style={[
          styles.card,
          { 
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOpacity: isDark ? 0.25 : 0.1
          }
        ]}>
          <View style={styles.cardHeader}>
            <View style={styles.leftContent}>
              <ThemedText style={styles.petName}>{item.petName}</ThemedText>
              <ThemedText style={styles.userName}>
                {activeTab === 'SENT' ? 'Para: ' : 'De: '}{item.userName}
              </ThemedText>
            </View>
            
            <View 
              style={[
                styles.statusBadge, 
                { backgroundColor: getStatusColor(item.status) }
              ]}
            >
              <ThemedText style={styles.statusText}>
                {getStatusText(item.status)}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.cardBody}>
            {item.petImage ? (
              <View style={styles.imageContainer}>                <View style={styles.petImageWrapper}>
                  <TouchableOpacity>
                    <Ionicons name="paw" size={24} color={colors.accent} style={styles.petIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
            
            <View style={styles.infoContainer}>              <View style={styles.infoItem}>                <Ionicons name="calendar-outline" size={16} color={colors.accent} />
                <ThemedText style={styles.infoText}>
                  Solicitado em: {formatDate(item.createdAt)}
                </ThemedText>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={16} color={colors.accent} />
                <ThemedText style={styles.infoText}>
                  Atualizado em: {formatDate(item.updatedAt)}
                </ThemedText>
              </View>
            </View>
          </View>
          
          <View style={styles.cardFooter}>
            <ThemedText style={styles.viewDetailsText}>
              Toque para ver detalhes
            </ThemedText>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>
        </ThemedCard>
      </TouchableOpacity>
    );
  };
  
  const renderEmptyState = () => {
    if (loading) {      return (        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <ThemedText style={styles.loadingText}>
            Carregando reivindicações...
          </ThemedText>
        </View>
      );
    }
      return (
      <EmptyState
        message={
          activeTab === 'SENT' 
            ? "Você não tem reivindicações enviadas. Quando você reivindicar um pet encontrado, ele aparecerá aqui." 
            : "Você não tem reivindicações recebidas. Quando alguém reivindicar seu pet perdido, as solicitações aparecerão aqui."
        }
      />
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>      
      <Stack.Screen
        options={{
          headerTitle: "Reivindicações",
          headerTitleStyle: { fontWeight: 'bold' },
          headerShadowVisible: false
        }}
      />      
      
      <View style={[
        styles.tabContainer,
        { 
          backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 1)',
          shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
          shadowOpacity: isDark ? 0.25 : 0.1
        }
      ]}>        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'SENT' && [styles.activeTab, { backgroundColor: colors.accent }]
          ]}
          onPress={() => switchTab('SENT')}
          activeOpacity={0.7}
        >
          <ThemedText 
            style={[
              styles.tabText,
              activeTab === 'SENT' && styles.activeTabText
            ]}
          >
            Enviadas
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'RECEIVED' && [styles.activeTab, { backgroundColor: colors.accent }]
          ]}
          onPress={() => switchTab('RECEIVED')}
          activeOpacity={0.7}
        >
          <ThemedText 
            style={[
              styles.tabText,
              activeTab === 'RECEIVED' && styles.activeTabText
            ]}
          >
            Recebidas
          </ThemedText>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={claims}
        renderItem={renderClaimItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },  
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    padding: 5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },  activeTab: {
    backgroundColor: '#ED5014',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: 'bold',
    color: 'white',
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  itemContainer: {
    marginBottom: 16,
  },  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  leftContent: {
    flex: 1,
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userName: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  cardBody: {
    padding: 12,
  },
  imageContainer: {
    height: 160,
    marginBottom: 12,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  petImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petIcon: {
    opacity: 0.8,
  },
  infoContainer: {
    
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  viewDetailsText: {
    fontSize: 13,
  },
});