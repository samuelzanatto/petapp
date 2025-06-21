import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
  Image, 
  Platform,
  Alert,
  Text,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Region, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import ThemedButton from '@/components/ThemedButton';
import { Loading } from '@/components/Loading';
import { getImageUrl } from '@/utils/imageUtils';
import { GOOGLE_MAPS_API_KEY } from '@/constants/Config';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';
import { FontFamily } from '@/constants/Fonts';

const { width, height } = Dimensions.get('window');

// Tipo para os pets encontrados
type FoundPet = {
  id: string;
  description: string;
  lastSeenLocation: string;
  createdAt: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  name: string;
  species: 'DOG' | 'CAT';
  breed: string;
  similarity?: number;
  user: {
    id: string;
    name: string;
    profileImage: string | null;
    phone: string | null;
  }
};

const DEFAULT_SEARCH_RADIUS = 10; // Em km
const INITIAL_ZOOM = 0.01; // Nível de zoom inicial (menor = mais zoom)
const CITY_ZOOM = 0.1; // Nível de zoom da cidade

export default function FinderScreen() {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  
  // Estados principais
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [foundPets, setFoundPets] = useState<FoundPet[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [selectedPetIndex, setSelectedPetIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Animações
  const searchButtonWidth = useRef(new Animated.Value(60)).current;
  const searchButtonOpacity = useRef(new Animated.Value(1)).current;
  const cardAnimation = useRef(new Animated.Value(0)).current;
  
  // Efeito para obter localização inicial
  useEffect(() => {
    getCurrentLocation();
  }, []);
  
  // Função para obter localização atual
  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permissão de localização negada. É necessário permitir para usar esta funcionalidade.');
        setLoading(false);
        return;
      }
      
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      setLocation(currentLocation);
      
      // Configurar região do mapa
      const newRegion = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: INITIAL_ZOOM,
        longitudeDelta: INITIAL_ZOOM
      };
      
      setRegion(newRegion);
      
      // Centralizar mapa na localização atual
      mapRef.current?.animateToRegion(newRegion, 1000);
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      setError('Não foi possível obter sua localização. Verifique se o GPS está ativado.');
      setLoading(false);
    }
  };
  
  // Função para centralizar o mapa na localização do usuário
  const centerMapOnUser = () => {
    if (location && region) {
      const userRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: INITIAL_ZOOM,
        longitudeDelta: INITIAL_ZOOM
      };
      
      mapRef.current?.animateToRegion(userRegion, 800);
    }
  };

  // Inicia a busca de pets encontrados nas proximidades
  const startSearch = async () => {
    if (!location) {
      Alert.alert('Localização não disponível', 'Não é possível buscar sem sua localização atual.');
      return;
    }
    
    try {
      setIsSearching(true);
      setSearchStatus('Ampliando a Busca');
      
      // Animar o botão expandindo-o
      Animated.parallel([
        Animated.timing(searchButtonWidth, {
          toValue: 200,
          duration: 300,
          useNativeDriver: false
        }),
        Animated.timing(searchButtonOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false
        })
      ]).start();
      
      // Animar o mapa para mostrar uma área maior
      if (region) {
        const cityRegion = {
          ...region,
          latitudeDelta: CITY_ZOOM,
          longitudeDelta: CITY_ZOOM
        };
        
        mapRef.current?.animateToRegion(cityRegion, 800);
      }
      
      // Atraso artificial para permitir que a animação de zoom termine
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Buscar pets encontrados nas proximidades
      setSearchStatus('Buscando Pets');
      
      // Atraso adicional para que o usuário veja a mensagem "Buscando pets encontrados..."
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Chamar a API com os parâmetros necessários
      const params = new URLSearchParams({
        latitude: String(location.coords.latitude),
        longitude: String(location.coords.longitude),
        radius: String(DEFAULT_SEARCH_RADIUS),
        compareWithUserPets: 'true' // Ativar comparação de imagens
      });
      
      // Corrigido para buscar pets encontrados por outras pessoas
      const response = await api.get(`/alerts/found?${params.toString()}`);
      
      // Log para diagnóstico
      console.log('Resposta da API (pets encontrados):', JSON.stringify(response));
      
      // Atraso para simular processamento de comparação de imagens
      if (response && Array.isArray(response) && response.length > 0) {
        setSearchStatus('Comparando Imagens');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!response || !Array.isArray(response)) {
        throw new Error('Resposta inválida da API');
      }
      
      const formattedPets = response.map(pet => {
        // Mapear corretamente os campos da API para o formato esperado
        return {
          id: pet.id,
          name: pet.name || 'Pet sem nome',
          species: pet.species,
          breed: pet.breed || '',
          description: pet.description || '',
          // Usar a descrição como localização se lastSeenLocation estiver vazio
          lastSeenLocation: pet.lastSeenLocation || pet.description || 'Localização desconhecida',
          createdAt: pet.createdAt,
          latitude: pet.latitude,
          longitude: pet.longitude,
          // Formatar a URL da imagem
          imageUrl: pet.imageUrl 
            ? (pet.imageUrl.startsWith('http') ? pet.imageUrl : getImageUrl(pet.imageUrl)) 
            : null,
          // Definir similarity mesmo que não venha da API (para mostrar "Desconhecida")
          similarity: pet.similarity || 0,
          // Mapear ownerName, ownerId e ownerImage para o formato esperado
          user: {
            id: pet.ownerId || 'unknown',
            name: pet.ownerName || 'Usuário desconhecido',
            profileImage: pet.ownerImage
              ? (pet.ownerImage.startsWith('http') ? pet.ownerImage : getImageUrl(pet.ownerImage))
              : null,
            phone: pet.ownerPhone || null
          }
        };
      });
      
      setFoundPets(formattedPets);
      setSearchStatus(`${formattedPets.length} Pets Encontrados`);
      
      // Se encontrou pets, seleciona o primeiro para exibir
      if (formattedPets.length > 0) {
        setSelectedPetIndex(0);
        
        // Animar para mostrar o card
        Animated.timing(cardAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }).start();
        
        // Centralizar mapa na localização do primeiro pet com offset vertical
        // para que o marcador fique visível acima do card
        const firstPet = formattedPets[0];
        if (firstPet.latitude && firstPet.longitude) {
          // Calculando a região para centralizar o pet na parte superior do mapa
          const petRegion = {
            latitude: firstPet.latitude,
            longitude: firstPet.longitude,
            latitudeDelta: INITIAL_ZOOM,
            longitudeDelta: INITIAL_ZOOM
          };
          
          // Ajustando a latitude para deslocar o centro para cima
          // Isso fará com que o pet apareça na parte superior do mapa
          mapRef.current?.animateToRegion(petRegion, 800);
          
          // Após um breve atraso, fazemos um ajuste fino para 
          // garantir que o marcador fique visível acima do card
          setTimeout(() => {
            if (mapRef.current) {
              const adjustedRegion = {
                ...petRegion,
                // Deslocando a latitude um pouco para cima
                latitude: firstPet.latitude - (INITIAL_ZOOM * 0.3)
              };
              mapRef.current.animateToRegion(adjustedRegion, 300);
            }
          }, 850);
        }
      } else {
        setSearchStatus('Nenhum Pet Encontrado nas Proximidades');
        // Retornar ao tamanho original após um tempo
        setTimeout(() => resetSearchButton(), 3000);
      }
    } catch (error) {
      console.error('Erro na busca de pets:', error);
      setSearchStatus('Erro na busca');
      setError('Não foi possível buscar pets nas proximidades.');
      // Retornar ao tamanho original após um tempo
      setTimeout(() => resetSearchButton(), 3000);
    }
  };
  
  // Resetar o botão de busca para o estado original
  const resetSearchButton = () => {
    Animated.parallel([
      Animated.timing(searchButtonWidth, {
        toValue: 60,
        duration: 300,
        useNativeDriver: false
      }),
      Animated.timing(searchButtonOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false
      })
    ]).start(() => {
      setIsSearching(false);
      setSearchStatus('');
      // Limpar os pets encontrados para remover os marcadores do mapa
      setFoundPets([]);
      
      // Voltar o zoom do mapa para a localização do usuário
      if (location && region) {
        const userRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: INITIAL_ZOOM,
          longitudeDelta: INITIAL_ZOOM
        };
        
        mapRef.current?.animateToRegion(userRegion, 800);
      }
    });
  };
  
  // Navegar para o próximo pet
  const nextPet = () => {
    if (selectedPetIndex < foundPets.length - 1) {
      setSelectedPetIndex(selectedPetIndex + 1);
      
      // Centralizar mapa na localização do próximo pet
      const nextPetData = foundPets[selectedPetIndex + 1];
      if (nextPetData.latitude && nextPetData.longitude) {
        const petRegion = {
          latitude: nextPetData.latitude,
          longitude: nextPetData.longitude,
          latitudeDelta: INITIAL_ZOOM,
          longitudeDelta: INITIAL_ZOOM
        };
        
        mapRef.current?.animateToRegion(petRegion, 800);
      }
    } else {
      // Se for o último pet, voltar para a localização do usuário
      if (location) {
        const userRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: INITIAL_ZOOM,
          longitudeDelta: INITIAL_ZOOM
        };
        
        mapRef.current?.animateToRegion(userRegion, 800);
      }
      
      // Esconder o card
      Animated.timing(cardAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start(() => {
        setSelectedPetIndex(-1);
        // Limpar o array de pets encontrados para remover os marcadores
        setFoundPets([]);
        resetSearchButton();
      });
    }
  };  // Função para acessar a tela de reivindicação do pet
  const claimPet = () => {
    if (!selectedPet) return;

    console.log('Dados do pet para reivindicação:', JSON.stringify(selectedPet, null, 2));

    // Verificar se o usuário está tentando reivindicar o próprio pet
    if (selectedPet.user && selectedPet.user.id === user?.id) {
      Alert.alert(
        'Não é possível reivindicar',
        'Você não pode reivindicar um pet que você mesmo reportou como encontrado.'
      );
      return;
    }

    // Navegar para a tela de reivindicação com os dados do pet encontrado
    router.push({
      pathname: '/pet/claim',
      params: { 
        alertId: selectedPet.id, // ID do alerta (foundPetAlert.id)
        petName: selectedPet.species === 'DOG' ? 'Cachorro encontrado' : 'Gato encontrado',
        petImage: selectedPet.imageUrl || '',
        alertType: 'FOUND' // Explicitamente marcando que é um alerta FOUND
      }
    });
  };

  // Renderizar marcadores de pets no mapa
  const renderPetMarkers = () => {
    return foundPets.map((pet, index) => (
      <Marker
        key={pet.id}
        coordinate={{
          latitude: pet.latitude,
          longitude: pet.longitude
        }}
        title={pet.name}
        description={pet.description || 'Pet encontrado'}
        onPress={() => {
          setSelectedPetIndex(index);
          
          // Animar para mostrar o card se estiver escondido
          if (selectedPetIndex === -1) {
            Animated.timing(cardAnimation, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true
            }).start();
          }
        }}
      >
        {/* Marcador personalizado baseado na espécie do pet */}
        <View style={[
          styles.petMarker,
          { 
            backgroundColor: colors.accent,
            // Efeito glow/neon para o marcador
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 6,
            shadowOpacity: 0.8,
            elevation: 6,
          },
          selectedPetIndex === index ? styles.selectedMarker : {}
        ]}>
          <Ionicons 
            name={pet.species === 'DOG' ? "paw" : "ios-fish"} 
            size={18} 
            color="#FFFFFF" 
          />
        </View>
      </Marker>
    ));
  };
  
  // Formatar a similaridade como porcentagem
  const formatSimilarity = (similarity?: number) => {
    if (!similarity) return "Desconhecida";
    // Converter para porcentagem (0-100%)
    const percentage = Math.round(similarity * 100);
    return `${percentage}%`;
  };
  
  const selectedPet = selectedPetIndex >= 0 && selectedPetIndex < foundPets.length 
    ? foundPets[selectedPetIndex] 
    : null;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    mapContainer: {
      flex: 1,
      position: 'relative',
    },
    map: {
      ...StyleSheet.absoluteFillObject,
      height: '110%'
    },
    searchButtonContainer: {
      position: 'absolute',
      bottom: 110,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    searchButton: {
      height: 60,
      borderRadius: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 5,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.6)',
    },
    searchButtonTouchable: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 15,
    },
    searchStatusText: {
      marginLeft: 10,
      fontSize: 14,
      fontFamily: FontFamily.medium,
    },
    petCardContainer: {
      position: 'absolute',
      bottom: 180,
      left: 20,
      right: 20,
      zIndex: 5,
    },
    petCard: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: isDark ? 'rgba(45, 45, 45, 0.85)' : 'rgba(255, 255, 255, 1)',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.35 : 0.2,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    },
    petCardHeader: {
      marginBottom: 15,
    },
    petInfoHeader: {
      flexDirection: 'row',
      marginBottom: 15,
    },
    petImage: {
      width: 80,
      height: 80,
      borderRadius: 12,
      marginRight: 15,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.05)',
      backgroundColor: isDark ? '#333' : '#f0f0f0',
    },
    petHeaderInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    petName: {
      fontSize: 18,
      fontFamily: FontFamily.bold,
      marginBottom: 4,
      color: isDark ? '#FFFFFF' : '#333333',
    },
    petBreed: {
      fontSize: 14,
      marginBottom: 8,
      fontFamily: FontFamily.regular,
      color: isDark ? '#AAAAAA' : '#666666',
    },
    ownerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    ownerImage: {
      width: 26,
      height: 26,
      borderRadius: 13,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: isDark ? '#333' : '#f0f0f0',
    },
    ownerName: {
      fontSize: 13,
      fontFamily: FontFamily.medium,
      color: isDark ? '#AAAAAA' : '#666666',
    },
    locationText: {
      fontSize: 14,
      marginBottom: 8,
      fontFamily: FontFamily.regular,
      color: isDark ? '#FFFFFF' : '#333333',
    },
    descriptionText: {
      fontSize: 14,
      marginTop: 6,
      marginBottom: 6,
      fontFamily: FontFamily.regular,
      color: isDark ? '#AAAAAA' : '#666666',
    },
    similarityContainer: {
      marginTop: 5,
      marginBottom: 12,
    },
    similarityText: {
      fontSize: 13,
      marginBottom: 4,
      fontFamily: FontFamily.regular,
      color: isDark ? '#AAAAAA' : '#666666',
    },
    similarityBar: {
      height: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 3,
      overflow: 'hidden',
    },
    similarityFill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 5,
    },
    notMyPetButton: {
      flex: 1,
      height: 45,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
      marginRight: 10,
    },
    contactButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: 45,
      backgroundColor: colors.accent,
      borderRadius: 16,
      overflow: 'hidden',
    },
    contactButtonText: {
      color: '#FFF',
      fontFamily: FontFamily.bold,
      fontSize: 14,
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    errorText: {
      marginTop: 15,
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 20,
      fontFamily: FontFamily.regular,
    },
    retryButton: {
      marginTop: 10,
      borderRadius: 16,
    },
    petMarker: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 6,
      shadowOpacity: 0.7,
      elevation: 6,
    },
    selectedMarker: {
      borderWidth: 3,
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 10,
    },
    userLocationMarker: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: '#FFFFFF',
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 8,
      shadowOpacity: 0.8,
      elevation: 8,
    },
    centerButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 70 : 20, 
      right: 20,
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      // Efeito glow/neon
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 8,
      shadowOpacity: 0.8,
      elevation: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.6)',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Loading />
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <ThemedButton 
            title="Tentar Novamente"
            onPress={getCurrentLocation}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
      {/* Mapa */}
      <View style={styles.mapContainer}>
        {region && (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={region}
            showsUserLocation={false} // Desativando o marcador padrão do usuário
            showsMyLocationButton={false} // Desativando o botão padrão de localização
            showsCompass
            toolbarEnabled
            customMapStyle={isDark ? darkMapStyle : lightMapStyle}
          >
            {foundPets.length > 0 && renderPetMarkers()}
            
            {/* Marcador personalizado da localização do usuário */}
            {location && (
              <Marker
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude
                }}
                title="Sua localização"
              >
                {/* Aqui será substituído pelo ícone de pessoa depois que o asset for adicionado */}
                <View style={styles.userLocationMarker}>
                  <Ionicons name="person" size={18} color="#FFFFFF" />
                </View>
              </Marker>
            )}
          </MapView>
        )}
        
        {/* Botão personalizado para centralizar no usuário */}
        <TouchableOpacity 
          style={[
            styles.centerButton, 
            { 
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 8,
              shadowOpacity: 0.8,
              elevation: 8
            }
          ]} 
          onPress={centerMapOnUser}
        >
          <Ionicons name="locate" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        {/* Botão de busca centralizado na parte inferior */}
        <View style={styles.searchButtonContainer}>
          <Animated.View 
            style={[
              styles.searchButton,
              { 
                width: searchButtonWidth,
                backgroundColor: colors.accent,
                // Efeito glow/neon
                shadowColor: colors.accent,
                shadowOffset: { width: 0, height: 0 },
                shadowRadius: 8,
                shadowOpacity: 0.8,
                elevation: 8,
                borderColor: isSearching ? colors.accent : 'transparent'
              }
            ]}
          >
            <TouchableOpacity 
              onPress={isSearching ? resetSearchButton : startSearch}
              style={styles.searchButtonTouchable}
              disabled={loading}
            >
              <Ionicons
                name={isSearching ? "close-circle" : "search"} 
                size={24} 
                color="#FFFFFF"
              />
              {isSearching && (
                <Animated.Text 
                  style={[
                    styles.searchStatusText,
                    { opacity: searchButtonOpacity, color: '#FFFFFF' }
                  ]}
                >
                  {searchStatus}
                </Animated.Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
        
        {/* Card com informações do pet */}
        {selectedPet && (
          <Animated.View 
            style={[
              styles.petCardContainer,
              {
                transform: [{
                  translateY: cardAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0]
                  })
                }]
              }
            ]}
          >
            <View style={styles.petCard}>
              <View style={styles.petCardHeader}>
                <View style={styles.petInfoHeader}>
                  <Image 
                    source={
                      selectedPet.imageUrl 
                        ? { uri: selectedPet.imageUrl } 
                        : require('@/assets/images/default-pet.png')
                    } 
                    style={styles.petImage} 
                  />
                  <View style={styles.petHeaderInfo}>
                    <Text style={[styles.petName, { color: isDark ? '#FFFFFF' : '#333333' }]}>
                      {selectedPet.name}
                    </Text>
                    <Text style={[styles.petBreed, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                      {selectedPet.species === 'DOG' ? '🐶 ' : '🐱 '} 
                      {selectedPet.breed || (selectedPet.species === 'DOG' ? 'Cachorro' : 'Gato')}
                    </Text>
                    
                    <View style={styles.similarityContainer}>
                      <Text style={[styles.similarityText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                        Semelhança: {formatSimilarity(selectedPet.similarity)}
                      </Text>
                      <View style={styles.similarityBar}>
                        <LinearGradient
                          colors={[colors.accent, '#FF8A43']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.similarityFill,
                            { width: `${Math.round((selectedPet.similarity || 0) * 100)}%` }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>
                </View>
                
                <View style={styles.ownerInfo}>
                  <Image 
                    source={
                      selectedPet.user.profileImage 
                        ? { uri: selectedPet.user.profileImage } 
                        : require('@/assets/images/default-avatar.png')
                    } 
                    style={styles.ownerImage} 
                  />
                  <Text style={[styles.ownerName, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                    Encontrado por {selectedPet.user.name}
                  </Text>
                </View>
                
                <Text style={[styles.locationText, { color: isDark ? '#FFFFFF' : '#333333' }]}>
                  Localização: {selectedPet.lastSeenLocation}
                </Text>
                
                {selectedPet.description && selectedPet.description !== selectedPet.lastSeenLocation && (
                  <Text style={[styles.descriptionText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                    {selectedPet.description}
                  </Text>
                )}
              </View>
              
              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={[styles.notMyPetButton, { 
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
                  }]}
                  onPress={nextPet}
                  activeOpacity={0.7}
                >
                  <Text style={{ 
                    color: isDark ? '#FFFFFF' : '#333333', 
                    fontFamily: FontFamily.medium 
                  }}>
                    Não é meu pet
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.contactButton}
                  onPress={claimPet}
                  activeOpacity={0.8}
                >
                  <Text style={styles.contactButtonText}>Reivindicar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

// Estilo personalizado para o mapa no modo claro
const lightMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#ffffff"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#dadada"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e9e9e9"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  }
];

// Estilo personalizado para o mapa no modo escuro
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#181818"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1b1b1b"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#2c2c2c"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8a8a8a"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#373737"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3c3c3c"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4e4e4e"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3d3d3d"
      }
    ]
  }
];