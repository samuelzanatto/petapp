import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import ThemedButton from '@/components/ThemedButton';
import { useTheme } from '@/contexts/theme';
import { useAuth } from '@/contexts/auth';
import { api } from '@/services/api';
import { getImageUrl } from '@/utils/imageUtils';
import { Constants } from '@/constants/Config';

export default function LostPetDetailsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const alertId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  
  useEffect(() => {
    const loadAlertDetails = async () => {
      try {
        const response = await api.get(`/alerts/lost/${alertId}`);
        setAlert(response);
        setIsOwner(response.userId === user?.id);
      } catch (error) {
        console.error('Erro ao carregar detalhes do alerta:', error);
        Alert.alert('Erro', 'Não foi possível carregar os detalhes deste pet perdido.');
      } finally {
        setLoading(false);
      }
    };
    
    loadAlertDetails();
  }, [alertId, user?.id]);
  
  // Compartilhar alerta
  const handleShare = async () => {
    if (!alert) return;
    
    try {
      const petName = alert.pet.name;
      const appUrl = Constants.DEEP_LINK_URL || 'https://petapp.com';
      const shareUrl = `${appUrl}/pet/lost/${alertId}`;
      
      await Share.share({
        message: `${petName} está perdido! Por favor, ajude a encontrá-lo. Se você o vir, reporte através deste link: ${shareUrl}`,
        url: shareUrl,
        title: `Ajude a encontrar ${petName}`
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };
  
  // Abrir localização no mapa
  const openInMaps = () => {
    if (!alert || !alert.latitude || !alert.longitude) return;
    
    const { latitude, longitude } = alert;
    const label = alert.lastSeenLocation || `Local onde ${alert.pet.name} foi visto pela última vez`;
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`
    });
    
    if (url) {
      Linking.openURL(url);
    }
  };
  
  // Iniciar chat com o dono do pet
  const contactOwner = () => {
    if (!alert) return;
    
    // Verificar se é o próprio dono
    if (isOwner) {
      Alert.alert('Informação', 'Você é o dono deste pet.');
      return;
    }
    
    router.push(`/chat/user/${alert.userId}`);
  };
  
  // Reportar avistamento
  const reportSighting = () => {
    router.push(`/pet/report-sighting/${alertId}`);
  };
  
  // Ver avistamentos
  const viewSightings = () => {
    router.push(`/pet/sightings/${alertId}`);
  };
  
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <ThemedText style={{ marginTop: 16 }}>Carregando detalhes...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!alert) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.text} />
          <ThemedText style={styles.errorText}>Alerta não encontrado</ThemedText>
          <TouchableOpacity
            style={[styles.backButtonFull, { backgroundColor: colors.accent }]}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.backButtonText}>Voltar</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const formattedLastSeen = alert.lastSeenAt ? 
    format(new Date(alert.lastSeenAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 
    format(new Date(alert.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  
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
          Pet Perdido
        </ThemedText>
        <TouchableOpacity 
          onPress={handleShare} 
          style={styles.shareButton}
        >
          <Ionicons name="share-social-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Badge de urgente se for marcado como tal */}
        {alert.isUrgent && (
          <View style={[styles.urgentBadge, { backgroundColor: '#FF3B30' }]}>
            <Ionicons name="warning-outline" size={20} color="#FFFFFF" />
            <ThemedText style={styles.urgentText} forceLightMode>URGENTE</ThemedText>
          </View>
        )}
        
        {/* Informações do pet */}
        <ThemedCard style={styles.petCard}>
          {/* Imagem do pet */}
          <View style={styles.imageContainer}>
            <Image 
              source={
                alert.pet.primaryImage ? 
                  { uri: getImageUrl(alert.pet.primaryImage) } : 
                  require('@/assets/images/default-pet.png')
              }
              style={styles.petImage}
              resizeMode="cover"
            />
          </View>
          
          <View style={styles.petInfo}>
            <ThemedText style={styles.petName}>{alert.pet.name}</ThemedText>
            <ThemedText style={styles.petSpecies}>
              {alert.pet.species === 'DOG' ? '🐶 Cachorro' : '🐱 Gato'}
              {alert.pet.breed ? ` • ${alert.pet.breed}` : ''}
            </ThemedText>
            
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.text} />
              <ThemedText style={styles.infoText}>
                {alert.pet.age ? `${alert.pet.age} ${alert.pet.age > 1 ? 'anos' : 'ano'}` : 'Idade não informada'}
              </ThemedText>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="color-palette-outline" size={16} color={colors.text} />
              <ThemedText style={styles.infoText}>
                {alert.pet.primaryColor || 'Cor não informada'}
                {alert.pet.secondaryColor ? ` e ${alert.pet.secondaryColor}` : ''}
              </ThemedText>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="body-outline" size={16} color={colors.text} />
              <ThemedText style={styles.infoText}>
                {alert.pet.size || 'Tamanho não informado'}
              </ThemedText>
            </View>
            
            {alert.pet.distinguishingMarks && (
              <View style={styles.infoRow}>
                <Ionicons name="paw-outline" size={16} color={colors.text} />
                <ThemedText style={styles.infoText}>
                  {alert.pet.distinguishingMarks}
                </ThemedText>
              </View>
            )}
          </View>
        </ThemedCard>
        
        {/* Informações sobre o desaparecimento */}
        <ThemedCard style={styles.detailsCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={22} color={colors.accent} />
            <ThemedText style={styles.sectionTitle}>Detalhes do Desaparecimento</ThemedText>
          </View>
          
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Visto pela última vez:</ThemedText>
            <ThemedText style={styles.detailValue}>{formattedLastSeen}</ThemedText>
          </View>
          
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Local:</ThemedText>
            <ThemedText style={styles.detailValue}>{alert.lastSeenLocation || 'Local não especificado'}</ThemedText>
          </View>
          
          {alert.reward && alert.reward > 0 && (
            <View style={[styles.rewardContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Ionicons name="cash-outline" size={22} color={colors.accent} />
              <ThemedText style={styles.rewardText}>
                Recompensa: R$ {alert.reward.toFixed(2).replace('.', ',')}
              </ThemedText>
            </View>
          )}
          
          {/* Descrição do alerta */}
          {alert.description && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <Ionicons name="document-text-outline" size={22} color={colors.accent} />
                <ThemedText style={styles.sectionTitle}>Descrição</ThemedText>
              </View>
              <ThemedText style={styles.description}>
                {alert.description}
              </ThemedText>
            </>
          )}
        </ThemedCard>
        
        {/* Mapa com última localização */}
        {alert.latitude && alert.longitude && (
          <ThemedCard style={styles.mapCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={22} color={colors.accent} />
              <ThemedText style={styles.sectionTitle}>Última Localização</ThemedText>
            </View>
            
            <View style={styles.mapContainer}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                  latitude: alert.latitude,
                  longitude: alert.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                scrollEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                zoomEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: alert.latitude,
                    longitude: alert.longitude,
                  }}
                  title={`${alert.pet.name} foi visto aqui pela última vez`}
                >
                  <View style={[styles.customMarker, {
                    backgroundColor: colors.accent,
                    borderWidth: 2,
                    borderColor: 'white',
                  }]}>
                    <Ionicons name="paw" size={18} color="#FFF" />
                  </View>
                </Marker>
              </MapView>
              
              <TouchableOpacity 
                style={[styles.openMapsButton, { backgroundColor: colors.card }]}
                onPress={openInMaps}
              >
                <ThemedText style={styles.openMapsText}>
                  Abrir no mapa
                </ThemedText>
                <Ionicons name="open-outline" size={16} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </ThemedCard>
        )}
        
        {/* Informações de contato */}
        <ThemedCard style={styles.contactCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={22} color={colors.accent} />
            <ThemedText style={styles.sectionTitle}>Contato</ThemedText>
          </View>
          
          <View style={styles.ownerInfo}>
            <Image 
              source={
                alert.user.profileImage ? 
                  { uri: getImageUrl(alert.user.profileImage) } : 
                  require('@/assets/images/default-avatar.png')
              }
              style={styles.ownerImage}
            />
            <View style={styles.ownerDetails}>
              <ThemedText style={styles.ownerName}>{alert.user.name}</ThemedText>
              {isOwner && (
                <ThemedText style={[styles.ownerTagYou, { backgroundColor: colors.accent }]}>
                  Você
                </ThemedText>
              )}
            </View>
          </View>
          
          {/* Botões de ação */}
          <View style={styles.actionButtons}>
            {!isOwner && (
              <ThemedButton
                title="Contatar Dono"
                onPress={contactOwner}
                style={styles.actionButton}
                textStyle={{ fontWeight: 'bold' }}
              />
            )}
            
            <ThemedButton
              title="Ver Avistamentos"
              onPress={viewSightings}
              style={styles.actionButton}
              variant="outline"
              textStyle={{ fontWeight: 'bold' }}
            />
            
            {!isOwner && (
              <ThemedButton
                title="Reportar Avistamento"
                onPress={reportSighting}
                style={styles.actionButton}
                variant="secondary"
                textStyle={{ fontWeight: 'bold' }}
              />
            )}
          </View>
        </ThemedCard>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 12,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButtonFull: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  urgentText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  petCard: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 200,
  },
  petImage: {
    width: '100%',
    height: '100%',
  },
  petInfo: {
    padding: 16,
  },
  petName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  petSpecies: {
    fontSize: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 15,
  },
  detailsCard: {
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  mapCard: {
    padding: 16,
    marginBottom: 16,
  },
  mapContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  customMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  openMapsButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  openMapsText: {
    fontSize: 14,
    marginRight: 6,
  },
  contactCard: {
    padding: 16,
    marginBottom: 16,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ownerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  ownerDetails: {
    marginLeft: 12,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  ownerTagYou: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 8,
  },
});
