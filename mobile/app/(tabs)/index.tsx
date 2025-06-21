import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Image, 
  TouchableOpacity,
  FlatList, 
  RefreshControl,
  Dimensions,
  ImageBackground,
  Animated,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth';
import { api } from '@/services/api';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedView } from '@/components/ThemedView';
import ThemedButton from '@/components/ThemedButton';
import { Bold, Typography, H1, Body, Small } from '@/components/Typography';
import { getImageUrl } from '@/utils/imageUtils';
import { Loading } from '@/components/Loading';
import { FontFamily } from '@/constants/Fonts';
import { textStyles } from '@/utils/styleUtils';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

type LostPet = {
  id: string;
  description: string;
  lastSeenLocation: string;
  createdAt: string;
  lastSeenAt: string;
  foundAt: string;
  name: string;
  species: 'DOG' | 'CAT';
  breed: string;
  imageUrl: string | null;
  ownerId: string;
  ownerName: string;
  ownerImage: string | null;
  distance?: number;
};

// Tipo para status de reivindicação
type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

// Tipo para reivindicações de pet
type PetClaim = {
  id: string;
  alertId: string;
  status: ClaimStatus;
  createdAt: string;
  updatedAt: string;
  petName: string;
  petImage: string | null;
  userName: string;
  userImage: string | null;
  type: 'SENT' | 'RECEIVED';
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [nearbyPets, setNearbyPets] = useState<LostPet[]>([]);
  const [activeClaims, setActiveClaims] = useState<PetClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchNearbyPets = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      
      // Buscar dados da API
      const data = await api.get('/alerts/lost');
      
      // Simular dados de pets próximos (na implementação real usaria geolocalização)
      // Aqui ordenamos por distância e pegamos os 3 primeiros
      const nearbyData = data
        .map((pet: LostPet) => ({
          ...pet,
          imageUrl: getImageUrl(pet.imageUrl),
          ownerImage: getImageUrl(pet.ownerImage),
          // Simulando uma distância aleatória entre 0.5 e 10 km
          distance: Math.random() * 9.5 + 0.5
        }))
        .sort((a: LostPet, b: LostPet) => (a.distance || 999) - (b.distance || 999))
        .slice(0, 3);
      
      setNearbyPets(nearbyData);
    } catch (error) {
      console.error('Erro ao buscar pets próximos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchActiveClaims = async () => {
    try {
      // Buscar reivindicações enviadas pelo usuário
      const sentClaims = await api.get('/claims');
      
      // Buscar reivindicações recebidas (para alertas criados pelo usuário)
      const receivedClaims = await api.get('/claims/received');

      // Console para debug
      console.log('Dados recebidos - sentClaims:', JSON.stringify(sentClaims, null, 2));

      // Filtrar apenas reivindicações ativas (PENDING, APPROVED)
      const activeSentClaims = sentClaims
        .filter((claim: any) => claim.status === 'PENDING' || claim.status === 'APPROVED')
        .map((claim: any) => {
          // Formatar um nome melhor para o pet encontrado
          let petNameFormatted;
          
          // Verificar se o alerta existe e tem uma descrição
          if (claim.alert?.description) {
            petNameFormatted = claim.alert.description;
          } 
          // Se não tem descrição, usar a espécie com cor se disponível
          else if (claim.alert?.species) {
            petNameFormatted = claim.alert?.color 
              ? `${claim.alert.species === 'DOG' ? 'Cachorro' : 'Gato'} ${claim.alert.color}` 
              : (claim.alert.species === 'DOG' ? 'Cachorro encontrado' : 'Gato encontrado');
          } 
          // Fallback genérico
          else {
            petNameFormatted = 'Pet encontrado';
          }
          
          return {
            ...claim,
            petName: petNameFormatted,
            petImage: claim.alert?.image,
            userName: claim.alert?.user?.name,
            userImage: claim.alert?.user?.profileImage,
            type: 'SENT' as const
          };
        });
      
      const activeReceivedClaims = receivedClaims
        .filter((claim: any) => claim.status === 'PENDING' || claim.status === 'APPROVED')
        .map((claim: any) => {
          // Formatar um nome melhor para o pet encontrado
          let petNameFormatted;
          
          // Verificar se o alerta existe e tem uma descrição
          if (claim.alert?.description) {
            petNameFormatted = claim.alert.description;
          } 
          // Se não tem descrição, usar a espécie com cor se disponível
          else if (claim.alert?.species) {
            petNameFormatted = claim.alert?.color 
              ? `${claim.alert.species === 'DOG' ? 'Cachorro' : 'Gato'} ${claim.alert.color}` 
              : (claim.alert.species === 'DOG' ? 'Cachorro encontrado' : 'Gato encontrado');
          } 
          // Fallback genérico
          else {
            petNameFormatted = 'Pet encontrado';
          }
          
          return {
            ...claim,
            petName: petNameFormatted,
            petImage: claim.alert?.image,
            userName: claim.claimant?.name,
            userImage: claim.claimant?.profileImage,
            type: 'RECEIVED' as const
          };
        });
      
      // Juntar as duas listas e ordenar pela data de atualização (mais recente primeiro)
      const allActiveClaims = [...activeSentClaims, ...activeReceivedClaims]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      console.log('Reivindicações ativas formatadas:', JSON.stringify(allActiveClaims, null, 2));
      
      setActiveClaims(allActiveClaims);
      
    } catch (error) {
      console.error('Erro ao buscar reivindicações ativas:', error);
    }
  };
  
  useEffect(() => {
    fetchNearbyPets();
    fetchActiveClaims(); // Adicionar chamada para buscar reivindicações ativas
  }, []);
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNearbyPets();
    fetchActiveClaims(); // Atualizar reivindicações ao fazer pull-to-refresh
  }, []);
  
  // Obter o período do dia para a saudação
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Bom dia';
    if (hours < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Função para obter texto legível para o status da reivindicação
  const getStatusText = (status: ClaimStatus) => {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'APPROVED': return 'Aprovada';
      case 'REJECTED': return 'Rejeitada';
      case 'COMPLETED': return 'Concluída';
      case 'CANCELLED': return 'Cancelada';
      default: return status;
    }
  };
  
  // Função para obter cor do status da reivindicação
  const getStatusColor = (status: ClaimStatus) => {
    switch (status) {
      case 'PENDING': return '#F0A500'; // Amarelo alaranjado
      case 'APPROVED': return '#4CAF50'; // Verde
      case 'REJECTED': return '#F44336'; // Vermelho
      case 'COMPLETED': return '#2196F3'; // Azul
      case 'CANCELLED': return '#9E9E9E'; // Cinza
      default: return '#9E9E9E';
    }
  };

  // Componente para renderizar um card de reivindicação
  const renderClaimCard = (claim: PetClaim) => (
    <TouchableOpacity 
      style={styles.claimCard}
      onPress={() => router.push(`/claims/${claim.id}`)}
      activeOpacity={0.8}
      key={claim.id}
    >
      <View style={styles.claimCardHeader}>
        <ThemedText style={{ fontFamily: FontFamily.medium }}>
          {claim.type === 'SENT' ? 'Reivindicação Enviada' : 'Reivindicação Recebida'}
        </ThemedText>
      </View>
      <View style={styles.claimCardContent}>
        <Image
          source={
            claim.petImage
              ? { uri: getImageUrl(claim.petImage) }
              : require('@/assets/images/default-pet.png')
          }
          style={styles.claimPetImage}
          defaultSource={require('@/assets/images/default-pet.png')}
        />
        <View style={styles.claimInfo}>
          <ThemedText style={styles.claimPetName}>{claim.petName}</ThemedText>
          <ThemedText style={styles.claimTypeLabel}>
            {claim.type === 'SENT' 
              ? 'Você reivindicou este pet' 
              : `Reivindicado por ${claim.userName}`}
          </ThemedText>
          <View style={styles.claimStatusContainer}>
            <View style={[styles.claimStatusDot, { backgroundColor: getStatusColor(claim.status) }]} />
            <ThemedText style={[styles.claimStatusText, { color: getStatusColor(claim.status) }]}>
              {getStatusText(claim.status)}
            </ThemedText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 200,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 30,
      paddingTop: Platform.OS === 'ios' ? 15 : 10,
      paddingBottom: 35,
    },
    greeting: {
      fontSize: 14,
      opacity: 0.8,
      fontFamily: FontFamily.regular,
    },
    username: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 2,
      borderColor: colors.accent,
      backgroundColor: isDark ? '#333' : '#f0f0f0',
    },
    bannerContainer: {
      marginHorizontal: 20,
      height: 180,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 25,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 30,
      borderRadius: 16,
      height: '100%',
    },
    bannerImage: {
      width: 100,
      height: 100,
      resizeMode: 'contain',
    },
    bannerContent: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingVertical: 25,
    },
    bannerTitle: {
      color: 'white',
      fontSize: 22,
      marginBottom: 8,
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    bannerSubtitle: {
      color: 'white',
      fontSize: 14,
      marginBottom: 12,
      paddingRight: 70,
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    bannerButton: {
      backgroundColor: '#FFFFFF',
      width: 110,
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 16,
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 8,
      shadowOpacity: 0.5,
      elevation: 5,
    },
    bannerButtonText: {
      color: colors.accent,
      fontFamily: FontFamily.bold,
    },
    servicesContainer: {
      marginHorizontal: 20,
      marginBottom: 25,
    },
    servicesRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 15,
    },
    serviceButton: {
      width: (width - 40 - 20) / 3,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      borderRadius: 16,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    serviceIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center', 
      alignItems: 'center',
      marginBottom: 8,
    },
    serviceText: {
      fontSize: 12,
      fontWeight: '600',
    },
    sectionContainer: {
      marginBottom: 25,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 15,
    },
    sectionTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionIcon: {
      marginRight: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: FontFamily.bold,
    },
    seeAll: {
      fontSize: 14,
      fontFamily: FontFamily.medium,
    },
    nearbyPetsContainer: {
      flexGrow: 0,
    },
    nearbyPetsContent: {
      paddingHorizontal: 15,
    },
    nearbyPetCard: {
      width: 180,
      borderRadius: 16,
      overflow: 'hidden',
      marginHorizontal: 5,
      marginBottom: 10,
      backgroundColor: isDark ? 'rgba(45, 45, 45, 0.6)' : 'rgba(255, 255, 255, 1)',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    nearbyPetImage: {
      width: '100%',
      height: 120,
      resizeMode: 'cover',
    },
    petBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(237, 80, 20, 0.9)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    petBadgeText: {
      color: 'white',
      fontSize: 10,
      fontWeight: 'bold',
    },
    nearbyPetInfo: {
      padding: 12,
    },
    nearbyPetName: {
      fontSize: 16,
      fontFamily: FontFamily.bold,
      marginBottom: 4,
    },
    nearbyPetMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    nearbyPetLocation: {
      fontSize: 12,
      opacity: 0.7,
      fontFamily: FontFamily.regular,
    },
    loadingContainer: {
      height: 180,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      height: 180,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginHorizontal: 20,
      backgroundColor: isDark ? 'rgba(45, 45, 45, 0.6)' : 'rgba(255, 255, 255, 1)',
      borderRadius: 16,
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 10,
      opacity: 0.7,
      fontFamily: FontFamily.bold,
    },
    floatingButton: {
      position: 'absolute',
      bottom: 110,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 8,
      shadowOpacity: 0.5,
      elevation: 5,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    claimsContainer: {
      marginBottom: 25,
    },
    claimCard: {
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 12,
      marginHorizontal: 20,
      backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 1)',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    claimCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    claimCardContent: {
      flexDirection: 'row',
      padding: 12,
    },
    claimPetImage: {
      width: 65,
      height: 65,
      borderRadius: 8,
      marginRight: 12,
    },
    claimInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    claimPetName: {
      fontSize: 16,
      fontFamily: FontFamily.bold,
      marginBottom: 4,
    },
    claimTypeLabel: {
      fontSize: 12,
      fontFamily: FontFamily.regular,
      marginBottom: 4,
      opacity: 0.8,
    },
    claimStatusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    claimStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    claimStatusText: {
      fontSize: 12,
      fontFamily: FontFamily.medium,
    },
  });
  
  const renderNearbyPet = ({ item }: { item: LostPet }) => (
    <TouchableOpacity 
      style={styles.nearbyPetCard}
      onPress={() => router.push(`/pet/lost-details/${item.id}`)}
      activeOpacity={0.8}
    >
      <Image
        source={
          item.imageUrl
            ? { uri: item.imageUrl }
            : require('@/assets/images/default-pet.png')
        }
        style={styles.nearbyPetImage}
        defaultSource={require('@/assets/images/default-pet.png')}
      />
      {/* Badge de distância removido */}
      <View style={styles.nearbyPetInfo}>
        <ThemedText style={styles.nearbyPetName}>{item.name}</ThemedText>
        <View style={styles.nearbyPetMeta}>
          <ThemedText style={styles.nearbyPetLocation} numberOfLines={1}>
            {item.lastSeenLocation}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
  
  const renderServiceButton = (
    icon: string, 
    title: string, 
    onPress: () => void,
    color: string,
    backgroundColor: string
  ) => (
    <TouchableOpacity 
      style={[styles.serviceButton, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.serviceIconContainer, { backgroundColor: color + '30' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <ThemedText style={styles.serviceText}>{title}</ThemedText>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={isDark ? '#FFFFFF' : colors.accent}
            title="Atualizando..."
            titleColor={isDark ? '#FFFFFF' : '#333333'}
          />
        }
      >
        {/* Header com saudação e avatar */}
        <View style={styles.header}>
          <View>
            <Body style={styles.greeting}>{getGreeting()},</Body>
            <H1 style={[styles.username, { color: isDark ? '#FFFFFF' : '#333333' }]}>
              {user?.name || 'Amante de Pets'}
            </H1>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <Image
              source={
                user?.profileImage
                  ? { uri: getImageUrl(user.profileImage) }
                  : require('../../assets/images/default-avatar.png')
              }
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>
        
        {/* Banner principal */}
        <TouchableOpacity 
          style={styles.bannerContainer}
          onPress={() => router.push('/(tabs)/report')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[colors.accent, '#FF8A43']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.banner}
          >
            <View style={styles.bannerContent}>
              <Bold style={styles.bannerTitle}>
                Perdeu seu pet?
              </Bold>
              <Small style={styles.bannerSubtitle}>
                Reporte agora e encontre ajuda na comunidade
              </Small>
              <TouchableOpacity 
                style={styles.bannerButton}
                onPress={() => router.push('/(tabs)/report')}
              >
                <Bold style={styles.bannerButtonText}>
                  Reportar
                </Bold>
              </TouchableOpacity>
            </View>
            <Image
              source={require('../../assets/images/banner-pets.png')}
              style={styles.bannerImage}
            />
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Cards de Reivindicações Ativas */}
        {activeClaims.length > 0 && (
          <View style={styles.claimsContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons 
                  name="alert-circle-outline" 
                  size={24} 
                  color={colors.accent}
                  style={styles.sectionIcon}
                />
                <ThemedText style={styles.sectionTitle}>Reivindicações Ativas</ThemedText>
              </View>
            </View>
            
            {activeClaims.map(claim => renderClaimCard(claim))}
          </View>
        )}
        
        {/* Menu de serviços/categorias */}
        <View style={styles.servicesContainer}>
          <View style={styles.servicesRow}>
            {renderServiceButton(
              'paw-outline',
              'Feed',
              () => router.push('/(tabs)/explore'),
              colors.accent,
              isDark ? 'rgba(53, 46, 40, 0.8)' : 'rgba(255, 255, 255, 1)'
            )}
            {renderServiceButton(
              'search-outline',
              'Encontrados',
              () => router.push('/finder'),
              '#B29064',
              isDark ? 'rgba(53, 46, 40, 0.8)' : 'rgba(255, 255, 255, 1)'
            )}
            {renderServiceButton(
              'chatbubble-ellipses-outline',
              'Chat',
              () => router.push('/chat'),
              '#A95930',
              isDark ? 'rgba(53, 46, 40, 0.8)' : 'rgba(255, 255, 255, 1)'
            )}
          </View>
          
          <View style={styles.servicesRow}>
            {renderServiceButton(
              'megaphone-outline',
              'Reportar',
              () => router.push('/(tabs)/report'),
              '#ED9A70',
              isDark ? 'rgba(53, 46, 40, 0.8)' : 'rgba(255, 255, 255, 1)'
            )}
            {renderServiceButton(
              'person-add-outline',
              'Seguindo',
              () => router.push(`/follow/following/${user?.id}`),
              '#452A1F',
              isDark ? 'rgba(53, 46, 40, 0.8)' : 'rgba(255, 255, 255, 1)'
            )}
            {renderServiceButton(
              'camera-outline',
              'Post',
              () => router.push('/camera'),
              '#797983',
              isDark ? 'rgba(53, 46, 40, 0.8)' : 'rgba(255, 255, 255, 1)'
            )}
          </View>
        </View>
        
        {/* Seção Nearby Pets */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons 
                name="location-outline" 
                size={24} 
                color={colors.accent}
                style={styles.sectionIcon}
              />
              <ThemedText style={styles.sectionTitle}>Pets Próximos</ThemedText>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
              <ThemedText style={[styles.seeAll, { color: colors.accent }]}>
                Ver Todos
              </ThemedText>
            </TouchableOpacity>
          </View>
          
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <Loading size="small" message="Buscando pets próximos..." />
            </View>
          ) : nearbyPets.length > 0 ? (
            <FlatList
              data={nearbyPets}
              renderItem={renderNearbyPet}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nearbyPetsContent}
              style={styles.nearbyPetsContainer}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons 
                name="paw-outline" 
                size={40} 
                color={isDark ? colors.accent + '60' : colors.accent + '80'}
                style={{ marginBottom: 15, opacity: 0.7 }}
              />
              <Bold style={styles.emptyText}>
                Não há pets perdidos próximos a você.
              </Bold>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Botão flutuante para adicionar novo pet */}
      <TouchableOpacity
        style={[styles.floatingButton, {
          backgroundColor: colors.accent,
          shadowColor: colors.accent,
        }]}
        onPress={() => router.push('/pet/create')}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}