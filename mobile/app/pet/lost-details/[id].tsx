import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Dimensions,
  ActivityIndicator,
  Alert,
  Share,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/auth';
import { api } from '@/services/api';
import { getImageUrl } from '@/utils/imageUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

type LostPet = {
  id: string;
  description: string;
  lastSeenLocation: string;
  lastSeenAt: string;
  latitude: number;
  longitude: number;
  reward: number | null;
  status: 'ACTIVE' | 'FOUND' | 'CANCELED';
  isUrgent: boolean;
  createdAt: string;
  updatedAt: string;
  pet: {
    id: string;
    name: string;
    species: 'DOG' | 'CAT';
    breed: string | null;
    nickname: string | null;
    birthDate: string | null;
    gender: 'MALE' | 'FEMALE' | null;
    color: string | null;
    coatType: string | null;
    size: 'SMALL' | 'MEDIUM' | 'LARGE' | null;    weight: number | null;
    description: string | null;    
    primaryImage: string | null;
    images: string[];
    isNeutered: boolean;
    hasSpecialNeeds: boolean;
    specialNeedsDescription: string | null;
    microchipNumber: string | null;
    medication: string | null;
    specialDiet: string | null;
    // Novos campos comportamentais
    temperament?: string | null;
    isTrainedToCommands?: boolean;
    reactsTo?: string | null;
    secondaryColor?: string | null;
    distinguishingMarks?: string | null;
  };
  user: {
    id: string;
    name: string;
    profileImage: string | null;
    phone: string | null;
    whatsappPhone: string | null;
    emergencyPhone: string | null;
    emergencyContact: string | null;
  };
};

export default function LostPetDetails() {
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();
  const alertId = params.id as string;
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  
  const [alert, setAlert] = useState<LostPet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [distanceToLastSeen, setDistanceToLastSeen] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    details: true,
    medical: false,
    location: true,
    behavior: true
  });

  // Carrega os detalhes do alerta quando o componente montar
  useEffect(() => {
    let mounted = true;
    
    const load = async () => {
      try {
        await fetchAlertDetails();
        if (mounted) {
          await getUserLocation();
        }
      } catch (err) {
        console.error('Erro ao inicializar:', err);
      }
    };
    
    load();
    
    return () => {
      mounted = false;
    };
  }, [alertId]);

  // Função para buscar os detalhes com tratamento de erros aprimorado
  const fetchAlertDetails = async () => {
    try {
      setLoading(true);
      setError(null);
  
      // Obter token
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
  
      const response = await fetch(`${api.BASE_URL}/alerts/lost/${alertId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        throw new Error('Não foi possível obter os detalhes do alerta');
      }
      
      const data = await response.json();
      
      // Garantir que todas as propriedades críticas existam
      const sanitizedData = {
        ...data,
        pet: {
          ...data.pet,
          images: Array.isArray(data.pet?.images) ? data.pet.images : [],
          primaryImage: data.pet?.primaryImage || null,
          name: data.pet?.name || 'Pet sem nome',
          species: data.pet?.species || 'DOG',
          breed: data.pet?.breed || null,
          description: data.pet?.description || null,
          // Mapeamento correto:
          gender: data.pet?.gender || null,
          color: data.pet?.primaryColor || null,     // ✅ Mapear primaryColor para color
          coatType: data.pet?.furType || null,       // ✅ Mapear furType para coatType
          // Dados comportamentais:
          temperament: data.pet?.temperament || null,
          isTrainedToCommands: data.pet?.isTrainedToCommands || false,
          reactsTo: data.pet?.reactsTo || null,
          secondaryColor: data.pet?.secondaryColor || null,
          distinguishingMarks: data.pet?.distinguishingMarks || null,
        },
        user: {
          ...data.user,
          name: data.user?.name || 'Usuário',
          profileImage: data.user?.profileImage || null,
          phone: data.user?.phone || null,
          whatsappPhone: data.user?.whatsappPhone || null
        },
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        lastSeenLocation: data.lastSeenLocation || 'Local não informado',
        status: data.status || 'ACTIVE'
      };
      
      setAlert(sanitizedData);
    } catch (error: any) {
      console.error('Erro ao obter detalhes do alerta:', error);
      setError(error.message || 'Não foi possível carregar os detalhes do alerta de pet perdido. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      // Calcular distância apenas se o alerta estiver carregado corretamente
      if (alert?.latitude && alert?.longitude) {
        const distance = calculateDistance(
          location.coords.latitude, 
          location.coords.longitude,
          alert.latitude,
          alert.longitude
        );
        setDistanceToLastSeen(distance);
      }
    } catch (error) {
      console.error('Erro ao obter localização do usuário:', error);
      // Não definimos estado de erro aqui para não impedir o uso da tela
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distância em km
    return Math.round(distance * 10) / 10; // Arredondado para 1 casa decimal
  };

  const handleShare = async () => {
    if (!alert) return;
    
    try {
      const message = `ANIMAL PERDIDO: ${alert.pet.name}, um ${alert.pet.species === 'DOG' ? 'cachorro' : 'gato'} ${alert.pet.color ? `${alert.pet.color}` : ''} ${alert.pet.breed ? `da raça ${alert.pet.breed}` : ''}, foi visto pela última vez em ${alert.lastSeenLocation}. Por favor, entre em contato se você o viu!`;
      
      await Share.share({
        message,
        url: alert.pet.primaryImage || undefined,
        title: `Pet Perdido: ${alert.pet.name}`
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const handleReportSighting = async () => {
    if (!alert) return;
    
    Alert.alert(
      'Você viu este pet?',
      'Você tem informações sobre o paradeiro deste pet?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sim, eu vi', 
          onPress: () => router.push(`/pet/report-sighting/${alertId}`) 
        }
      ]
    );
  };

  const handleDirections = () => {
    if (!alert) return;
    
    const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
    const latLng = `${alert.latitude},${alert.longitude}`;
    const label = `Última localização de ${alert.pet.name}`;
    const url = Platform.select({
      ios: `${scheme}?q=${label}&ll=${latLng}`,
      android: `${scheme}0,0?q=${latLng}(${label})`
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Erro', 'Não foi possível abrir o aplicativo de mapas');
      });
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
  };

  const getTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR
    });
  };

  const getGenderText = (gender: 'MALE' | 'FEMALE' | null) => {
    if (!gender) return 'Não informado';
    return gender === 'MALE' ? 'Macho' : 'Fêmea';
  };

  const getSizeText = (size: 'SMALL' | 'MEDIUM' | 'LARGE' | null) => {
    if (!size) return 'Não informado';
    
    switch(size) {
      case 'SMALL': return 'Pequeno';
      case 'MEDIUM': return 'Médio';
      case 'LARGE': return 'Grande';
      default: return 'Não informado';
    }
  };

  const getStatusColor = (status: 'ACTIVE' | 'FOUND' | 'CANCELED') => {
    switch(status) {
      case 'ACTIVE': return '#ED5014';
      case 'FOUND': return '#4CAF50';
      case 'CANCELED': return '#9E9E9E';
      default: return '#ED5014';
    }
  };

  const getStatusText = (status: 'ACTIVE' | 'FOUND' | 'CANCELED') => {
    switch(status) {
      case 'ACTIVE': return 'Ativo';
      case 'FOUND': return 'Encontrado';
      case 'CANCELED': return 'Cancelado';
      default: return 'Ativo';
    }
  };

  const calculateAge = (dateString: string | null) => {
    if (!dateString) return null;
    
    const birthDate = new Date(dateString);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    const months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
    }
    
    return years;
  };

  const contactOwner = (method: 'call' | 'whatsapp') => {
    if (!alert) return;
    
    if (method === 'call' && alert.user.phone) {
      Linking.openURL(`tel:${alert.user.phone}`).catch(() => {
        Alert.alert('Erro', 'Não foi possível realizar a ligação');
      });
    } else if (method === 'whatsapp' && alert.user.whatsappPhone) {
      const phoneNumber = alert.user.whatsappPhone.replace(/\D/g, '');
      Linking.openURL(`https://wa.me/${phoneNumber}?text=Olá, vi seu alerta sobre o pet perdido ${alert.pet.name} no PetApp.`).catch(() => {
        Alert.alert('Erro', 'Não foi possível abrir o WhatsApp');
      });
    }
  };

    const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 18,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      zIndex: 10,
    },
    headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginRight: 8,
      color: colors.textHeader,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      color: 'white',
      fontSize: 10,
      fontWeight: 'bold',
    },
    backButton: {
      padding: 8,
    },
    shareButton: {
      padding: 8,
    },
    scrollView: {
      flex: 1,
      marginTop: -20,
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
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginVertical: 10,
    },
    errorText: {
      textAlign: 'center',
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: '#FF6B6B',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 25,
    },
    retryButtonText: {
      color: 'white',
      fontWeight: 'bold',
    },
    urgentBanner: {
      backgroundColor: '#FF3B30',
      paddingVertical: 8,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    urgentText: {
      color: 'white',
      fontWeight: 'bold',
      marginLeft: 8,
      fontSize: 16,
    },
    imageGallery: {
      width: '100%',
      height: 250,
      position: 'relative',
    },
    mainImage: {
      width: '100%',
      height: '100%',
    },
    imageDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      bottom: 15,
      width: '100%',
    },
    imageDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      marginHorizontal: 4,
    },
    activeImageDot: {
      backgroundColor: '#FFF',
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    foundOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    foundBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#4CAF50',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
    },
    foundText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
      marginLeft: 8,
    },
    timeContainer: {
      position: 'absolute',
      top: 36,
      right: 18,
      backgroundColor: 'rgba(0,0,0,0.6)',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    timeText: {
      color: 'white',
      fontSize: 12,
      marginLeft: 4,
    },
    basicInfoContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    nameContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 4,
    },
    petName: {
      fontSize: 26,
      fontWeight: 'bold',
    },
    nickname: {
      fontSize: 16,
      marginLeft: 8,
      opacity: 0.7,
    },
    speciesBreedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      flexWrap: 'wrap',
    },
    speciesText: {
      fontSize: 16,
    },
    breedText: {
      fontSize: 16,
      marginLeft: 6,
    },
    genderText: {
      fontSize: 16,
      marginLeft: 6,
    },
    rewardContainer: {
      marginBottom: 16,
    },
    rewardBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: colors.accent,
      borderRadius: 16,
      alignSelf: 'flex-start',
    },
    rewardText: {
      color: 'white',
      fontWeight: 'bold',
      marginLeft: 6,
    },
    lastSeenContainer: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: 'rgba(255,107,107,0.1)',
      borderRadius: 12,
      marginBottom: 10,
    },
    lastSeenIcon: {
      marginRight: 12,
      marginTop: 2,
    },
    lastSeenTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },
    lastSeenLocation: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 2,
    },
    lastSeenDate: {
      fontSize: 12,
    },
    distanceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 12,
      alignSelf: 'flex-start',
      marginTop: 6,
    },
    distanceText: {
      fontSize: 12,
      marginLeft: 4,
    },
    descriptionCard: {
      margin: 16,
      marginTop: 8,
      padding: 16,
      borderRadius: 12,
    },
    descriptionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    descriptionText: {
      fontSize: 14,
      lineHeight: 22,
    },
    sectionCard: {
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 16,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    sectionTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionIcon: {
      marginRight: 10,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
    },
    sectionContent: {
      padding: 16,
      paddingTop: 0,
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 16,
    },
    detailItem: {
      width: '50%',
      marginBottom: 16,
      paddingRight: 8,
    },
    detailLabel: {
      fontSize: 12,
      opacity: 0.7,
      marginBottom: 4,
    },
    detailValue: {
      fontSize: 16,
    },
    petDescriptionContainer: {
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.1)',
      paddingTop: 16,
    },
    petDescriptionLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    petDescriptionText: {
      fontSize: 14,
      lineHeight: 22,
    },
    medicalInfoGrid: {
      marginBottom: 16,
    },
    medicalInfoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    medicalLabelContainer: {
      flex: 1,
    },
    medicalLabel: {
      fontSize: 15,
    },
    medicalStatusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    medicalStatusText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 12,
    },
    textInfoContainer: {
      marginBottom: 16,
    },
    textInfoLabel: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 6,
    },
    textInfoValue: {
      fontSize: 14,
      lineHeight: 22,
    },
    medicalAlertContainer: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,107,107,0.1)',
      padding: 12,
      borderRadius: 8,
      alignItems: 'flex-start',
    },
    medicalAlertText: {
      fontSize: 13,
      marginLeft: 8,
      flex: 1,
      lineHeight: 18,
    },
    mapContainer: {
      height: 200,
      position: 'relative',
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
    customMarker: {
      backgroundColor: '#FF6B6B',
      padding: 8,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: 'white',
    },
    directionsButton: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    directionsButtonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 12,
      marginLeft: 4,
    },
    contactCard: {
      margin: 16,
      marginTop: 8,
      padding: 16,
      borderRadius: 12,
    },
    ownerInfoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    ownerAvatarContainer: {
      marginRight: 12,
    },
    ownerAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    ownerInfo: {
      flex: 1,
    },
    ownerName: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 4,
    },
    ownerTitle: {
      fontSize: 14,
    },
    contactButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    contactButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 20,
      flex: 1,
      marginHorizontal: 4,
    },
    contactButtonText: {
      color: 'white',
      fontWeight: '600',
      marginLeft: 6,
      fontSize: 12,
    },
    emergencyContactContainer: {
      marginTop: 8,
      padding: 12,
      backgroundColor: 'rgba(0,0,0,0.03)',
      borderRadius: 8,
    },
    emergencyContactTitle: {
      fontSize: 14,
      opacity: 0.8,
      marginBottom: 4,
    },
    emergencyContactName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    emergencyPhone: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    emergencyPhoneText: {
      marginLeft: 6,
      fontWeight: '500',
    },
    inactiveAlertMessage: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      padding: 12,
      backgroundColor: 'rgba(0,0,0,0.03)',
      borderRadius: 8,
    },
    inactiveAlertText: {
      marginLeft: 8,
      flex: 1,
    },
    floatingButtonContainer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.1)',
    },
    reportButton: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 50,
      borderRadius: 25,
      overflow: 'hidden',
      backgroundColor: colors.accent
    },
    reportButtonGradient: {
      height: '100%',
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    reportButtonIcon: {
      marginRight: 8,
    },
    reportButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },
    rewardDescription: {
      fontSize: 13,
      marginTop: 6,
      marginLeft: 8,
      fontStyle: 'italic',
      opacity: 0.8,
    },
    behaviorItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    behaviorLabel: {
      fontSize: 15,
      fontWeight: '500',
    },
    behaviorValue: {
      fontSize: 15,
    },
    behaviorBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    behaviorBadgeText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 12,
    },
    tipsContainer: {
      flexDirection: 'row',
      backgroundColor: 'rgba(33,150,243,0.1)',
      padding: 12,
      borderRadius: 8,
      alignItems: 'flex-start',
      marginTop: 8,
    },
    tipsText: {
      fontSize: 13,
      marginLeft: 8,
      flex: 1,
      lineHeight: 18,
    },
    imageNavButton: {
      position: 'absolute',
      top: '50%',
      marginTop: -25,
      width: 50,
      height: 50,
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageNavButtonLeft: {
      left: 10,
    },
    imageNavButtonRight: {
      right: 10,
    },
    imageCounter: {
      position: 'absolute',
      bottom: 15,
      right: 15,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 12,
    },
    imageCounterText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '500',
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
    },
    halfButton: {
      flex: 0.48, // Um pouco menos que metade para ter espaço entre os botões
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <ThemedText style={styles.loadingText}>Carregando informações do pet perdido...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !alert) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={70} color="#FF6B6B" />
          <ThemedText style={styles.errorTitle}>Oops!</ThemedText>
          <ThemedText style={styles.errorText}>{error || 'Ocorreu um erro ao carregar os detalhes do alerta.'}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAlertDetails}>
            <ThemedText style={styles.retryButtonText}>Tentar Novamente</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const petImages = Array.isArray(alert.pet.images) ? alert.pet.images : [];
  const primaryImage = alert.pet.primaryImage || '';

  const allImages = [];

  if (primaryImage) {
    allImages.push(getImageUrl(primaryImage));
  }

  if (petImages.length > 0) {
    petImages.forEach(img => {
      if (img && img !== primaryImage) {
        allImages.push(getImageUrl(img));
      }
    });
  }

  const isOwner = user?.id === alert.user.id;
  const isActive = alert.status === 'ACTIVE';

  console.log('=== DEBUG INFO ===');
  console.log('Pet Name:', alert?.pet?.name);
  console.log('Pet Nickname:', alert?.pet?.nickname);
  console.log('Pet Species:', alert?.pet?.species);
  console.log('Pet Breed:', alert?.pet?.breed);
  console.log('Pet Gender:', alert?.pet?.gender);
  console.log('Alert Status:', alert?.status);
  console.log('Is Active:', isActive);
  console.log('Reward:', alert?.reward);
  console.log('==================');

  return (
    <>      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView 
        edges={['top']} 
        style={{ backgroundColor: isDark ? colors.card : 'rgba(255,255,255,0.95)' }} 
      />
      
      <SafeAreaView 
        edges={['bottom', 'left', 'right']} 
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { 
          backgroundColor: isDark ? colors.card : 'rgba(255,255,255,1)',
        }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <ThemedText type="subtitle" style={styles.headerTitle}>
              Pet Perdido
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(alert.status) }]}>
              <ThemedText style={styles.statusText}>
                {getStatusText(alert.status)}
              </ThemedText>
            </View>
          </View>
          <TouchableOpacity 
            onPress={handleShare} 
            style={styles.shareButton}
            disabled={loading}
          >
            <Ionicons 
              name="share-outline" 
              size={24} 
              color={loading ? colors.textSecondary : colors.text} 
            />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
          {/* Banner de alerta urgente */}
          {alert?.isUrgent && isActive && (
            <View style={styles.urgentBanner}>
              <Ionicons name="warning" size={22} color="#FFF" />
              <ThemedText style={styles.urgentText}>
                ALERTA URGENTE
              </ThemedText>
            </View>
          )}
          
          {/* Galeria de Imagens */}
          <View style={styles.imageGallery}>
            <Image 
              source={
                allImages.length > 0 && activeImageIndex < allImages.length
                  ? { uri: allImages[activeImageIndex] }
                  : require('@/assets/images/default-pet.png')
              }
              style={styles.mainImage}
              resizeMode="cover"
            />

            {/* Botões de navegação de imagens */}
            {allImages.length > 1 && (
              <>
                <TouchableOpacity 
                  style={[styles.imageNavButton, styles.imageNavButtonLeft]}
                  onPress={() => setActiveImageIndex(prev => 
                    prev === 0 ? allImages.length - 1 : prev - 1
                  )}
                >
                  <Ionicons name="chevron-back" size={24} color="#FFF" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.imageNavButton, styles.imageNavButtonRight]}
                  onPress={() => setActiveImageIndex(prev => 
                    prev === allImages.length - 1 ? 0 : prev + 1
                  )}
                >
                  <Ionicons name="chevron-forward" size={24} color="#FFF" />
                </TouchableOpacity>
                
                <View style={styles.imageCounter}>
                  <ThemedText style={styles.imageCounterText}>
                    {activeImageIndex + 1}/{allImages.length}
                  </ThemedText>
                </View>
              </>
            )}

            {/* Status de encontrado */}
            {alert?.status === 'FOUND' && (
              <View style={styles.foundOverlay}>
                <View style={styles.foundBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                  <ThemedText style={styles.foundText}>Pet Encontrado</ThemedText>
                </View>
              </View>
            )}

            {/* Tempo desde a criação do alerta */}
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={16} color="#FFF" />
              <ThemedText style={styles.timeText}>
                {getTimeAgo(alert?.createdAt)}
              </ThemedText>
            </View>
          </View>
          
          {/* Informações Básicas e Recompensa */}
          <View style={styles.basicInfoContainer}>
            <View style={styles.nameContainer}>
              <ThemedText type="title" style={styles.petName}>
                {alert?.pet?.name}
              </ThemedText>
              
              {alert?.pet?.nickname && (
                <ThemedText style={styles.nickname}>
                  ({alert?.pet?.nickname})
                </ThemedText>
              )}
            </View>
            
            <View style={styles.speciesBreedContainer}>
              <ThemedText style={styles.speciesText}>
                {alert?.pet?.species === 'DOG' ? '🐶 Cachorro' : '🐱 Gato'}
              </ThemedText>

              <ThemedText style={styles.breedText}>
                • {alert?.pet?.breed || 'Raça não informada'}
              </ThemedText>

              <ThemedText style={styles.genderText}>
                • {alert?.pet?.gender ? getGenderText(alert?.pet?.gender) : 'Gênero não informado'}
              </ThemedText>
            </View>
            
            {isActive && (
              <View style={styles.rewardContainer}>
                <View style={styles.rewardBadge}>
                  <Ionicons name="gift" size={18} color="#FFF" />
                  <ThemedText style={styles.rewardText}>
                    {alert?.reward && alert.reward > 0 
                      ? `Recompensa: R$ ${alert.reward.toFixed(2)}` 
                      : 'Sem recompensa oferecida'}
                  </ThemedText>
                </View>
                    
                {/* Adiciona uma descrição da recompensa para motivar mais pessoas */}
                {alert?.reward && alert.reward > 0 && (
                  <ThemedText style={styles.rewardDescription}>
                    Esta recompensa será paga a quem encontrar e devolver o pet ao seu tutor.
                  </ThemedText>
                )}
              </View>
            )}
            
            {/* Última vez visto */}
            <View style={styles.lastSeenContainer}>
              <Ionicons name="location" size={18} color="#FF6B6B" style={styles.lastSeenIcon} />
              <View>
                <ThemedText style={styles.lastSeenTitle}>
                  Última vez visto em:
                </ThemedText>
                <ThemedText style={styles.lastSeenLocation}>
                  {alert?.lastSeenLocation || 'Local não informado'}
                </ThemedText>
                <ThemedText style={[styles.lastSeenDate, { color: colors.textSecondary }]}>
                  {formatDate(alert?.lastSeenAt || alert?.createdAt)}
                </ThemedText>
              </View>
            </View>
            
            {distanceToLastSeen !== null && (
              <View style={[styles.distanceBadge, { backgroundColor: isDark ? colors.card : '#F5F5F5' }]}>
                <Ionicons name="navigate" size={14} color={colors.textSecondary} />
                <ThemedText style={styles.distanceText}>
                  {distanceToLastSeen < 1 
                    ? `${(distanceToLastSeen * 1000).toFixed(0)}m de distância` 
                    : `${distanceToLastSeen.toFixed(1)}km de distância`}
                </ThemedText>
              </View>
            )}
          </View>
          
          {/* Descrição da situação */}
          <ThemedCard style={[styles.descriptionCard, {
            borderRadius: 16,
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4
          }]}>
            <ThemedText style={styles.descriptionTitle}>
              Informações sobre o desaparecimento
            </ThemedText>
            <ThemedText style={styles.descriptionText}>
              {alert?.description}
            </ThemedText>
          </ThemedCard>
            {/* Características do Pet */}
          <ThemedCard style={[styles.sectionCard, {
            borderRadius: 16,
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4
          }]}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('details')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="information-circle-outline" size={22} color={colors.accent} style={styles.sectionIcon} />
                <ThemedText style={styles.sectionTitle}>
                  Características para Identificação
                </ThemedText>
              </View>
              <Ionicons 
                name={expandedSections.details ? "chevron-up" : "chevron-down"} 
                size={22} 
                color={colors.text} 
              />
            </TouchableOpacity>
            
            {expandedSections.details && (
              <View style={styles.sectionContent}>
                <View style={styles.detailsGrid}>
                  {alert?.pet?.birthDate && (
                    <View style={styles.detailItem}>
                      <ThemedText style={styles.detailLabel}>Idade</ThemedText>
                      <ThemedText style={styles.detailValue}>
                        {calculateAge(alert?.pet?.birthDate)} anos
                      </ThemedText>
                    </View>
                  )}
                  
                  <View style={styles.detailItem}>
                    <ThemedText style={styles.detailLabel}>Porte</ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {getSizeText(alert?.pet?.size)}
                    </ThemedText>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <ThemedText style={styles.detailLabel}>Cor</ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {alert?.pet?.color || 'Não informada'}
                    </ThemedText>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <ThemedText style={styles.detailLabel}>Pelagem</ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {alert?.pet?.coatType || 'Não informada'}
                    </ThemedText>
                  </View>
                  
                  {alert?.pet?.weight && (
                    <View style={styles.detailItem}>
                      <ThemedText style={styles.detailLabel}>Peso</ThemedText>
                      <ThemedText style={styles.detailValue}>
                        {alert?.pet?.weight} kg
                      </ThemedText>
                    </View>
                  )}
                  
                  {alert?.pet?.microchipNumber && (
                    <View style={styles.detailItem}>
                      <ThemedText style={styles.detailLabel}>Microchip</ThemedText>
                      <ThemedText style={styles.detailValue}>
                        {alert?.pet?.microchipNumber}
                      </ThemedText>
                    </View>
                  )}
                </View>
                
                {alert?.pet?.description && (
                  <View style={styles.petDescriptionContainer}>
                    <ThemedText style={styles.petDescriptionLabel}>Sobre {alert?.pet?.name}</ThemedText>
                    <ThemedText style={styles.petDescriptionText}>
                      {alert?.pet?.description}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}
          </ThemedCard>          {/* Comportamento do Pet - Nova seção */}
          <ThemedCard style={[styles.sectionCard, {
            borderRadius: 16,
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4
          }]}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('behavior')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="happy-outline" size={22} color={colors.accent} style={styles.sectionIcon} />
                <ThemedText style={styles.sectionTitle}>
                  Comportamento e Personalidade
                </ThemedText>
              </View>
              <Ionicons 
                name={expandedSections.behavior ? "chevron-up" : "chevron-down"} 
                size={22} 
                color={colors.text} 
              />
            </TouchableOpacity>

            {expandedSections.behavior && (
              <View style={styles.sectionContent}>
                {/* Temperamento */}
                {alert?.pet?.temperament && (
                  <View style={styles.behaviorItem}>
                    <ThemedText style={styles.behaviorLabel}>Temperamento</ThemedText>
                    <ThemedText style={styles.behaviorValue}>
                      {alert?.pet?.temperament}
                    </ThemedText>
                  </View>
                )}

                {/* Responde a comandos */}
                {alert?.pet?.isTrainedToCommands !== undefined && (
                  <View style={styles.behaviorItem}>
                    <ThemedText style={styles.behaviorLabel}>Responde a comandos</ThemedText>
                    <View style={[
                      styles.behaviorBadge, 
                      { backgroundColor: alert?.pet?.isTrainedToCommands ? '#4CAF50' : '#FF9800' }
                    ]}>
                      <ThemedText style={styles.behaviorBadgeText}>
                        {alert?.pet?.isTrainedToCommands ? 'Sim' : 'Não'}
                      </ThemedText>
                    </View>
                  </View>
                )}

                {/* Reage a */}
                {alert?.pet?.reactsTo && (
                  <View style={styles.behaviorItem}>
                    <ThemedText style={styles.behaviorLabel}>Reage a</ThemedText>
                    <ThemedText style={styles.behaviorValue}>
                      {alert?.pet?.reactsTo}
                    </ThemedText>
                  </View>
                )}

                {/* Dicas para aproximação */}
                <View style={[styles.tipsContainer, {
                  backgroundColor: 'rgba(33,150,243,0.1)',
                  borderRadius: 8
                }]}>
                  <Ionicons name="information-circle" size={20} color={colors.accent} />
                  <ThemedText style={styles.tipsText}>
                    Ao encontrar este pet, aproxime-se com calma, fale em tom baixo e ofereça comida se possível. Evite movimentos bruscos que possam assustá-lo.
                  </ThemedText>
                </View>
              </View>
            )}
          </ThemedCard>
            {/* Informações Médicas */}
          <ThemedCard style={[styles.sectionCard, {
            borderRadius: 16,
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4
          }]}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('medical')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="medical-outline" size={22} color={colors.accent} style={styles.sectionIcon} />
                <ThemedText style={styles.sectionTitle}>
                  Informações Médicas e Cuidados
                </ThemedText>
              </View>
              <Ionicons 
                name={expandedSections.medical ? "chevron-up" : "chevron-down"} 
                size={22} 
                color={colors.text} 
              />
            </TouchableOpacity>
            
            {expandedSections.medical && (
              <View style={styles.sectionContent}>
                <View style={styles.medicalInfoGrid}>
                  <View style={styles.medicalInfoItem}>
                    <View style={styles.medicalLabelContainer}>
                      <ThemedText style={styles.medicalLabel}>Castrado/Esterilizado</ThemedText>
                    </View>
                    <View style={[
                      styles.medicalStatusBadge, 
                      { backgroundColor: alert?.pet?.isNeutered ? '#4CAF50' : '#FF9800' }
                    ]}>
                      <ThemedText style={styles.medicalStatusText}>
                        {alert?.pet?.isNeutered ? 'Sim' : 'Não'}
                      </ThemedText>
                    </View>
                  </View>
                  
                  <View style={styles.medicalInfoItem}>
                    <View style={styles.medicalLabelContainer}>
                      <ThemedText style={styles.medicalLabel}>Necessidades Especiais</ThemedText>
                    </View>
                    <View style={[
                      styles.medicalStatusBadge, 
                      { backgroundColor: alert?.pet?.hasSpecialNeeds ? '#FF5722' : '#4CAF50' }
                    ]}>
                      <ThemedText style={styles.medicalStatusText}>
                        {alert?.pet?.hasSpecialNeeds ? 'Sim' : 'Não'}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                
                {alert?.pet?.hasSpecialNeeds && alert?.pet?.specialNeedsDescription && (
                  <View style={styles.textInfoContainer}>
                    <ThemedText style={styles.textInfoLabel}>Necessidades Especiais</ThemedText>
                    <ThemedText style={styles.textInfoValue}>
                      {alert?.pet?.specialNeedsDescription}
                    </ThemedText>
                  </View>
                )}
                
                {alert?.pet?.medication && (
                  <View style={styles.textInfoContainer}>
                    <ThemedText style={styles.textInfoLabel}>Medicamentos</ThemedText>
                    <ThemedText style={styles.textInfoValue}>
                      {alert?.pet?.medication}
                    </ThemedText>
                  </View>
                )}
                
                {alert?.pet?.specialDiet && (
                  <View style={styles.textInfoContainer}>
                    <ThemedText style={styles.textInfoLabel}>Dieta Especial</ThemedText>
                    <ThemedText style={styles.textInfoValue}>
                      {alert?.pet?.specialDiet}
                    </ThemedText>
                  </View>
                )}
                
                <View style={[styles.medicalAlertContainer, {
                  backgroundColor: 'rgba(255,107,107,0.1)',
                  borderRadius: 8
                }]}>
                  <Ionicons name="alert-circle" size={20} color={colors.accent} />
                  <ThemedText style={styles.medicalAlertText}>
                    Essas informações são importantes para garantir o bem-estar do pet caso você o encontre.
                  </ThemedText>
                </View>
              </View>
            )}
          </ThemedCard>
            {/* Mapa de localização */}
          <ThemedCard style={[styles.sectionCard, {
            borderRadius: 16,
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4
          }]}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('location')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="map-outline" size={22} color={colors.accent} style={styles.sectionIcon} />
                <ThemedText style={styles.sectionTitle}>
                  Localização
                </ThemedText>
              </View>
              <Ionicons 
                name={expandedSections.location ? "chevron-up" : "chevron-down"} 
                size={22} 
                color={colors.text} 
              />
            </TouchableOpacity>
            
            {expandedSections.location && (
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: alert?.latitude,
                    longitude: alert?.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: alert?.latitude,
                      longitude: alert?.longitude,
                    }}
                    title={`${alert?.pet?.name} foi visto aqui`}
                    description={`Última vez visto em ${formatDate(alert?.lastSeenAt || alert?.createdAt)}`}
                  >
                    <View style={[styles.customMarker, {
                      backgroundColor: colors.accent,
                      borderWidth: 2,
                      borderColor: 'white',
                    }]}>
                      <Ionicons name="paw" size={18} color="#FFF" />
                    </View>
                  </Marker>
                  
                  {userLocation && (
                    <Marker
                      coordinate={userLocation}
                      title="Sua localização"
                      pinColor="#4285F4"
                    />
                  )}
                </MapView>
                
                <TouchableOpacity 
                  style={[styles.directionsButton, {
                    backgroundColor: colors.accent,
                    borderRadius: 20
                  }]}
                  onPress={handleDirections}
                  activeOpacity={0.7}
                >
                  <Ionicons name="navigate" size={16} color="#FFF" />
                  <ThemedText style={styles.directionsButtonText}>
                    Como Chegar
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </ThemedCard>
          
          {/* Informações de Contato do Tutor */}
          <ThemedCard style={[styles.contactCard, {
            borderRadius: 16,
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4
          }]}>
            <View style={styles.ownerInfoHeader}>
              <View style={styles.ownerAvatarContainer}>
                <Image 
                  source={
                    alert?.user?.profileImage 
                      ? { uri: alert?.user?.profileImage } 
                      : require('@/assets/images/default-avatar.png')
                  } 
                  style={styles.ownerAvatar} 
                />
              </View>
              <View style={styles.ownerInfo}>
                <ThemedText style={styles.ownerName}>{alert?.user?.name}</ThemedText>
                <ThemedText style={[styles.ownerTitle, { color: colors.textSecondary }]}>
                  Tutor do Pet
                </ThemedText>
              </View>
            </View>
            
            {isActive && (
              <View style={styles.contactButtons}>
                {alert?.user?.phone && (
                  <TouchableOpacity 
                    style={[styles.contactButton, { backgroundColor: '#4CAF50' }]}
                    onPress={() => contactOwner('call')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call" size={18} color="#FFF" />
                    <ThemedText style={styles.contactButtonText}>Ligar</ThemedText>
                  </TouchableOpacity>
                )}
                
                {alert?.user?.whatsappPhone && (
                  <TouchableOpacity 
                    style={[styles.contactButton, { backgroundColor: '#25D366' }]}
                    onPress={() => contactOwner('whatsapp')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
                    <ThemedText style={styles.contactButtonText}>WhatsApp</ThemedText>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.contactButton, { backgroundColor: colors.accent }]}
                  onPress={() => router.push(`/profile/${alert?.user?.id}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person" size={18} color="#FFF" />
                  <ThemedText style={styles.contactButtonText}>Perfil</ThemedText>
                </TouchableOpacity>
              </View>
            )}
            
            {alert?.user?.emergencyContact && alert?.user?.emergencyPhone && (
              <View style={styles.emergencyContactContainer}>
                <ThemedText style={styles.emergencyContactTitle}>
                  Contato de Emergência:
                </ThemedText>
                <ThemedText style={styles.emergencyContactName}>
                  {alert?.user?.emergencyContact}
                </ThemedText>
                <TouchableOpacity 
                  onPress={() => Linking.openURL(`tel:${alert?.user?.emergencyPhone}`)}
                  style={styles.emergencyPhone}
                >
                  <Ionicons name="call" size={14} color="#FF6B6B" />
                  <ThemedText style={[styles.emergencyPhoneText, { color: '#FF6B6B' }]}>
                    {alert?.user?.emergencyPhone}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
            
            {!isActive && (
              <View style={styles.inactiveAlertMessage}>
                <Ionicons 
                  name={alert?.status === 'FOUND' ? "checkmark-circle" : "information-circle"} 
                  size={20} 
                  color={alert?.status === 'FOUND' ? '#4CAF50' : colors.textSecondary} 
                />
                <ThemedText style={[styles.inactiveAlertText, { 
                  color: alert?.status === 'FOUND' ? '#4CAF50' : colors.textSecondary 
                }]}>
                  {alert?.status === 'FOUND' 
                    ? 'Este pet já foi encontrado! Obrigado pela sua ajuda.' 
                    : 'Este alerta não está mais ativo.'}
                </ThemedText>
              </View>
            )}
          </ThemedCard>
        </ScrollView>
          {/* Botões de reportar avistamento e reivindicar - fixos na parte inferior */}        {isActive && !isOwner && (
          <View style={[styles.floatingButtonContainer, { backgroundColor: isDark ? colors.card : 'rgba(255,255,255,0.95)' }]}>
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.reportButton, { width: '100%' }]}
                onPress={handleReportSighting}
                activeOpacity={0.7}
              >
                <Ionicons name="eye" size={20} color="#FFF" style={styles.reportButtonIcon} />
                <ThemedText style={styles.reportButtonText}>
                  Reportar Avistamento
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

