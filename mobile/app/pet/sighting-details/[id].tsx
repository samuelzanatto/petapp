import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { useTheme } from '@/contexts/theme';
import { useAuth } from '@/contexts/auth';
import { api } from '@/services/api';
import { getImageUrl } from '@/utils/imageUtils';
import ThemedButton from '@/components/ThemedButton';

export default function SightingDetailsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const sightingId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sighting, setSighting] = useState<any>(null);
  const [isPetOwner, setIsPetOwner] = useState(false);
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [recoveryNote, setRecoveryNote] = useState('');
  
  // Carregar detalhes do avistamento
  useEffect(() => {
    const loadSightingDetails = async () => {
      try {
        const response = await api.get(`/alerts/sightings/${sightingId}`);
        setSighting(response);
        
        // Verificar se o usuário logado é o dono do pet
        if (user && response.alert && response.alert.user) {
          setIsPetOwner(user.id === response.alert.user.id);
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do avistamento:', error);
        Alert.alert(
          'Erro',
          'Não foi possível carregar os detalhes do avistamento.',
          [
            { text: 'Voltar', onPress: () => router.back() }
          ]
        );
      } finally {
        setLoading(false);
      }
    };
    
    loadSightingDetails();
  }, [sightingId, user?.id]);
  
  // Função para abrir o local no mapa
  const openInMaps = () => {
    if (!sighting) return;
    
    const { latitude, longitude } = sighting;
    const label = sighting.locationName || 'Local do avistamento';
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`
    });
    
    if (url) {
      Linking.openURL(url);
    }
  };
  
  // Função para iniciar contato com a pessoa que reportou
  const contactReporter = () => {
    if (!sighting) return;
    router.push(`/chat/user/${sighting.reporter.id}`);
  };
  
  // Função para marcar o pet como encontrado
  const markPetAsFound = async () => {
    if (!sighting || !sighting.alert) return;
  
    setActionLoading(true);
  
    try {
      // Chamar a API para marcar o pet como encontrado
      await api.put(`/recovery/lost/${sighting.alert.id}/found`, {
        sightingId: sighting.id,
        resolution: recoveryNote || `Pet encontrado graças ao avistamento de ${sighting.reporter.name}`
      });
      
      Alert.alert(
        "Pet Recuperado!",
        "Seu pet foi marcado como encontrado. Que ótima notícia!",
        [
          { text: "OK", onPress: () => router.replace(`/pet/lost/${sighting.alert.id}`) }
        ]
      );
    } catch (error) {
      console.error("Erro ao marcar pet como recuperado:", error);
      Alert.alert(
        "Erro",
        "Não foi possível marcar o pet como recuperado. Tente novamente."
      );
    } finally {
      setActionLoading(false);
      setRecoveryModalVisible(false);
    }
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
  
  if (!sighting) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.text} />
          <ThemedText style={styles.errorText}>Avistamento não encontrado</ThemedText>
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
  
  // Formatar a data do avistamento
  const formattedDate = format(
    new Date(sighting.sightedAt),
    "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
    { locale: ptBR }
  );
  
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
          {sighting.hasFoundPet ? 'Pet Encontrado' : 'Detalhes do Avistamento'}
        </ThemedText>
        <View style={{ width: 24 }} /> {/* Espaço para balancear o header */}
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Badge para indicar pet encontrado */}
        {sighting.hasFoundPet && (
          <View style={[styles.foundBadge, { backgroundColor: colors.accent }]}>            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <ThemedText style={styles.foundBadgeText} color="#FFFFFF">
              Esta pessoa está com o pet
            </ThemedText>
          </View>
        )}
        
        {/* Informações do usuário que reportou */}
        <ThemedCard style={styles.reporterCard}>
          <View style={styles.reporterInfo}>
            <Image 
              source={
                sighting.reporter.profileImage 
                  ? { uri: getImageUrl(sighting.reporter.profileImage) }
                  : require('@/assets/images/default-avatar.png')
              }
              style={styles.avatar}
            />
            <View style={styles.reporterDetails}>
              <ThemedText style={styles.reporterName}>
                {sighting.reporter.name}
              </ThemedText>
              <ThemedText style={styles.reportedAt}>
                Reportado em {formattedDate}
              </ThemedText>
            </View>
          </View>
        </ThemedCard>
        
        {/* Localização */}
        <ThemedCard style={styles.locationCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={22} color={colors.accent} />
            <ThemedText style={styles.sectionTitle}>Localização</ThemedText>
          </View>
          
          <ThemedText style={styles.locationName}>
            {sighting.locationName}
          </ThemedText>
          
          {/* Mapa */}
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: sighting.latitude,
                longitude: sighting.longitude,
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
                  latitude: sighting.latitude,
                  longitude: sighting.longitude,
                }}
                title={sighting.hasFoundPet ? "Local onde o pet foi encontrado" : "Local onde o pet foi visto"}
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
        
        {/* Descrição */}
        <ThemedCard style={styles.descriptionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={22} color={colors.accent} />
            <ThemedText style={styles.sectionTitle}>Descrição</ThemedText>
          </View>
          
          <ThemedText style={styles.description}>
            {sighting.description}
          </ThemedText>
        </ThemedCard>
        
        {/* Imagem (se houver) */}
        {sighting.image && (
          <ThemedCard style={styles.imageCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="image-outline" size={22} color={colors.accent} />
              <ThemedText style={styles.sectionTitle}>Foto</ThemedText>
            </View>
            
            <Image 
              source={{ uri: getImageUrl(sighting.image) }}
              style={styles.sightingImage}
              resizeMode="cover"
            />
          </ThemedCard>
        )}        
        
        {/* Botões de ação */}
        {isPetOwner && sighting.alert && sighting.alert.status !== 'FOUND' && (
          <ThemedButton
            title="Marcar meu pet como encontrado"
            onPress={() => setRecoveryModalVisible(true)}
            style={styles.contactButton}
            variant="primary"
            textStyle={{ fontWeight: 'bold' }}
          />
        )}
        
        {/* Botão de contato */}
        <ThemedButton
          title="Entrar em contato com o responsável"
          onPress={contactReporter}
          style={styles.contactButton}
          variant={sighting.hasFoundPet ? "secondary" : "primary"}
          textStyle={{ fontWeight: 'bold' }}
        />
      </ScrollView>

      {/* Modal de confirmação para marcar pet como encontrado */}
      <Modal
        visible={recoveryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRecoveryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <ThemedText style={styles.modalTitle}>Confirmar Recuperação</ThemedText>
            
            <ThemedText style={styles.modalText}>
              Você está confirmando que seu pet foi encontrado graças a este avistamento.
              Esta ação não poderá ser desfeita.
            </ThemedText>
            
            <View style={styles.noteInputContainer}>
              <ThemedText style={styles.noteLabel}>Adicione uma nota sobre como o pet foi recuperado (opcional):</ThemedText>
              <TextInput
                style={[styles.noteInput, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border 
                }]}
                value={recoveryNote}
                onChangeText={setRecoveryNote}
                placeholder="Ex: Meu pet estava na casa do vizinho..."
                placeholderTextColor={colors.textSecondary}
                multiline={true}
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]} 
                onPress={() => setRecoveryModalVisible(false)}
                disabled={actionLoading}
              >
                <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.accent }]} 
                onPress={markPetAsFound}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.confirmButtonText} color="#FFFFFF">Confirmar</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 16,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  foundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  foundBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  reporterCard: {
    padding: 16,
    marginBottom: 16,
  },
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reporterAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  reporterDetails: {
    flex: 1,
  },
  reporterName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reportedAt: {
    fontSize: 13,
    opacity: 0.7,
  },
  locationCard: {
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
  locationName: {
    fontSize: 16,
    marginBottom: 12,
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
  descriptionCard: {
    padding: 16,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  imageCard: {
    padding: 16,
    marginBottom: 16,
  },
  sightingImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  contactButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  // Estilos para o modal de confirmação
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    padding: 24,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  noteInputContainer: {
    marginBottom: 20,
  },
  noteLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    marginRight: 10,
    borderWidth: 1,
  },
  confirmButton: {
    marginLeft: 10,
  },
  cancelButtonText: {
    fontWeight: 'bold',
  },
  confirmButtonText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
