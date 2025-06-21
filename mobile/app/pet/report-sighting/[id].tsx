import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  Platform, 
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Switch
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import ThemedButton from '@/components/ThemedButton';
import { useTheme } from '@/contexts/theme';
import { useAuth } from '@/contexts/auth';
import { api } from '@/services/api';
import { getImageUrl } from '@/utils/imageUtils';
import { FontFamily } from '@/constants/Fonts';

export default function ReportSightingScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const alertId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageDisplay, setImageDisplay] = useState<{ uri: string } | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [markedLocation, setMarkedLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationName, setLocationName] = useState<string>('Buscando sua localização...');
  const [petAlertDetails, setPetAlertDetails] = useState<any>(null);
  const [isClaimingPet, setIsClaimingPet] = useState(false);

  // Carregar detalhes do alerta do pet quando o componente montar
  useEffect(() => {
    const loadAlertDetails = async () => {
      try {
        const response = await api.get(`/alerts/lost/${alertId}`);
        setPetAlertDetails(response);
      } catch (error) {
        console.error('Erro ao buscar detalhes do alerta:', error);
      }
    };
    
    const getLocationAsync = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permissão necessária',
            'Precisamos da sua localização para registrar onde você viu o pet.'
          );
          return;
        }
        
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        setLocation(currentLocation);
        
        // Obter o nome da localização
        try {
          const [address] = await Location.reverseGeocodeAsync({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude
          });
          
          const locationStr = [
            address.street,
            address.district,
            address.subregion,
            address.city
          ].filter(Boolean).join(', ');
          
          setLocationName(locationStr || 'Localização atual');
        } catch (error) {
          console.error('Erro ao obter nome da localização:', error);
          setLocationName('Localização atual');
        }
      } catch (error) {
        console.error('Erro ao obter localização:', error);
        Alert.alert('Erro', 'Não foi possível obter sua localização atual.');
      }
    };

    Promise.all([loadAlertDetails(), getLocationAsync()])
      .finally(() => setInitialLoading(false));
  }, [alertId]);

  // Função para obter o nome de uma localização a partir de coordenadas
  const getLocationNameFromCoords = async (latitude: number, longitude: number) => {
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });
      
      const locationStr = [
        address.street,
        address.district,
        address.subregion,
        address.city
      ].filter(Boolean).join(', ');
      
      return locationStr || 'Local selecionado';
    } catch (error) {
      console.error('Erro ao obter nome da localização:', error);
      return 'Local selecionado';
    }
  };

  // Função para quando o usuário tocar no mapa para marcar um local
  const handleMapPress = async (e: any) => {
    const { coordinate } = e.nativeEvent;
    
    // Atualizar a localização marcada
    setMarkedLocation(coordinate);
    
    // Obter o nome do local
    const newLocationName = await getLocationNameFromCoords(coordinate.latitude, coordinate.longitude);
    setLocationName(newLocationName);
  };
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para anexar fotos.');
        return;
      }
        const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Imagem selecionada:', result.assets[0].uri);
        const uri = result.assets[0].uri;
        setImageUri(uri);
        setImageDisplay({ uri });
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem. Tente novamente.');
    }
  };
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à sua câmera para tirar fotos.');
        return;
      }
        const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Foto tirada:', result.assets[0].uri);
        const uri = result.assets[0].uri;
        setImageUri(uri);
        setImageDisplay({ uri });
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto. Tente novamente.');
    }
  };

  const handleSubmit = async () => {
    if (!location && !markedLocation) {
      Alert.alert('Erro', 'Não conseguimos obter sua localização. Tente novamente.');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Informações incompletas', 'Por favor, descreva como, quando e onde você viu o pet.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Usar a localização marcada pelo usuário se estiver disponível, caso contrário usar a localização atual
      const latitude = markedLocation ? markedLocation.latitude : location!.coords.latitude;
      const longitude = markedLocation ? markedLocation.longitude : location!.coords.longitude;
      
      if (isClaimingPet) {
        // Aqui vamos apenas reportar um avistamento com informações adicionais
        // indicando que o usuário está com o pet.
        // Em vez de modificar o backend, usaremos o formato de avistamento regular
        // mas destacaremos no texto que o usuário está com o pet
        
        // Criar um objeto FormData para enviar os dados
        const formData = new FormData();
        
        // Adicionar dados básicos
        formData.append('alertId', alertId);
        formData.append('description', `🚨 ATENÇÃO: ESTOU COM O PET! 🚨\n\n${description.trim()}`);
        formData.append('latitude', String(latitude));
        formData.append('longitude', String(longitude));
        formData.append('locationName', locationName);
        formData.append('sightedAt', new Date().toISOString());        formData.append('hasFoundPet', 'true'); // Campo adicional para sinalizar
        
        // Anexar a imagem ao FormData se ela existir
        if (imageUri) {
          const filename = imageUri.split('/').pop() || `sighting_${Date.now()}.jpg`;
          const fileExt = (filename.split('.').pop() || 'jpg').toLowerCase();
          const mimeType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : `image/${fileExt}`;
          
          console.log('Anexando imagem:', {
            uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
            name: filename,
            type: mimeType
          });
          
          // @ts-ignore - React Native's FormData differes from standard web FormData
          formData.append('image', {
            uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
            name: filename,
            type: mimeType
          } as any);
        }
        
        // Enviar para o backend como um avistamento especial
        await api.upload('/alerts/sightings', formData);
        
        Alert.alert(
          'Sucesso!',
          'Sua informação de que você está com o pet foi enviada com sucesso. O tutor entrará em contato com você logo.',
          [
            { 
              text: 'OK', 
              onPress: () => router.back()
            }
          ]
        );
      } else {
        // Fluxo de avistamento normal
        const formData = new FormData();
        
        // Adicionar dados básicos
        formData.append('alertId', alertId);        formData.append('description', description.trim());
        formData.append('latitude', String(latitude));
        formData.append('longitude', String(longitude));
        formData.append('locationName', locationName);
        formData.append('sightedAt', new Date().toISOString());
        
        // Anexar a imagem ao FormData se ela existir
        if (imageUri) {
          const filename = imageUri.split('/').pop() || `sighting_${Date.now()}.jpg`;
          const fileExt = (filename.split('.').pop() || 'jpg').toLowerCase();
          const mimeType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : `image/${fileExt}`;
          
          console.log('Anexando imagem:', {
            uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
            name: filename,
            type: mimeType
          });
          
          // @ts-ignore - React Native's FormData differes from standard web FormData
          formData.append('image', {
            uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
            name: filename,
            type: mimeType
          } as any);
        }
        
        // Enviar para o endpoint normal de avistamentos
        await api.upload('/alerts/sightings', formData);
        
        Alert.alert(
          'Sucesso!',
          'Obrigado por relatar o avistamento. O tutor do pet será notificado.',
          [
            { 
              text: 'OK', 
              onPress: () => router.back()
            }
          ]
        );
      }
    } catch (error) {
      console.error(`Erro ao enviar ${isClaimingPet ? 'informação de que está com o pet' : 'relato de avistamento'}:`, error);
      Alert.alert('Erro', `Não foi possível enviar o ${isClaimingPet ? 'relato' : 'avistamento'}. Tente novamente.`);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <ThemedText style={styles.loadingText}>Carregando...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>
            {isClaimingPet ? 'Reportar Pet Encontrado' : 'Relatar Avistamento'}
          </ThemedText>
          <View style={{ width: 24 }} /> {/* Espaço para balancear o header */}
        </View>
        
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Detalhes do pet */}
          {petAlertDetails && (
            <ThemedCard style={styles.petInfoCard}>
              <View style={styles.petInfoHeader}>
                <Image 
                  source={
                    petAlertDetails.pet.primaryImage 
                      ? { uri: getImageUrl(petAlertDetails.pet.primaryImage) } 
                      : require('@/assets/images/default-pet.png')
                  } 
                  style={styles.petImage} 
                />
                <View style={styles.petInfoContent}>
                  <ThemedText style={styles.petName}>{petAlertDetails.pet.name}</ThemedText>
                  <ThemedText style={styles.petDescription}>
                    {petAlertDetails.pet.species === 'DOG' ? 'Cachorro' : 'Gato'}
                    {petAlertDetails.pet.breed ? ` • ${petAlertDetails.pet.breed}` : ''}
                  </ThemedText>
                  <ThemedText style={styles.lastSeenInfo}>
                    Visto pela última vez em {format(new Date(petAlertDetails.lastSeenAt || petAlertDetails.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </ThemedText>
                </View>
              </View>
            </ThemedCard>
          )}
          
          {/* Formulário de avistamento */}
          <ThemedCard style={styles.formCard}>
            {/* Switch para alternar entre avistamento e reivindicação */}
            <View style={styles.switchContainer}>
              <ThemedText style={styles.switchLabel}>
                {isClaimingPet ? 'Estou com o pet comigo' : 'Apenas vi o pet'}
              </ThemedText>
              <Switch
                trackColor={{ false: '#767577', true: colors.accent }}
                thumbColor={isClaimingPet ? '#ffffff' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={() => setIsClaimingPet(!isClaimingPet)}
                value={isClaimingPet}
              />
            </View>
            
            <ThemedText style={styles.sectionTitle}>
              {isClaimingPet 
                ? 'Onde você encontrou este pet?' 
                : 'Onde você viu este pet?'}
            </ThemedText>
            <ThemedText style={styles.mapInstructions}>
              Toque no mapa para marcar o local exato onde você {isClaimingPet ? 'encontrou' : 'viu'} o pet.
            </ThemedText>
            
            {/* Exibir mapa com localização */}
            {location && (
              <View style={styles.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  onPress={handleMapPress}
                >
                  {/* Marcador da localização atual (azul) */}
                  <Marker
                    coordinate={{
                      latitude: location.coords.latitude,
                      longitude: location.coords.longitude,
                    }}
                    title="Sua localização atual"
                    pinColor="blue"
                  />
                  
                  {/* Marcador da localização marcada pelo usuário (vermelho) */}
                  {markedLocation && (
                    <Marker
                      coordinate={{
                        latitude: markedLocation.latitude,
                        longitude: markedLocation.longitude,
                      }}
                      title={isClaimingPet ? "Local onde o pet foi encontrado" : "Local onde o pet foi visto"}
                      description={locationName}
                    >
                      <View style={[styles.customMarker, {
                        backgroundColor: colors.accent,
                        borderWidth: 2,
                        borderColor: 'white',
                      }]}>
                        <Ionicons name="paw" size={18} color="#FFF" />
                      </View>
                    </Marker>
                  )}
                </MapView>
              </View>
            )}
            
            <View style={styles.locationInfo}>
              <Ionicons name="location-outline" size={20} color={colors.accent} />
              <ThemedText style={styles.locationText}>
                {markedLocation ? 'Local marcado: ' : 'Sua localização atual: '}{locationName}
              </ThemedText>
            </View>
            
            <ThemedText style={[styles.instructionText, { marginTop: 20 }]}>
              {isClaimingPet 
                ? 'Descreva como e quando você encontrou o pet, e suas informações de contato:'
                : 'Descreva como, quando e onde você viu o pet:'}
            </ThemedText>
            
            <TextInput
              style={[
                styles.descriptionInput,
                { 
                  color: colors.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                }
              ]}
              placeholder={isClaimingPet 
                ? "Ex: Encontrei o pet hoje no Parque Municipal. Está comigo e seguro. Podem entrar em contato pelo WhatsApp (99) 99999-9999."
                : "Ex: Vi o pet hoje por volta das 10h da manhã no Parque Municipal, estava sozinho perto do lago..."
              }
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
            
            <ThemedText style={styles.instructionText}>
              {isClaimingPet 
                ? 'Adicione uma foto do pet (importante para verificação):'
                : 'Adicione uma foto do local ou do pet (opcional):'}
            </ThemedText>
            
            <View style={styles.imageButtons}>
              <TouchableOpacity
                style={[
                  styles.imageButton,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                ]}
                onPress={handlePickImage}
              >
                <Ionicons name="images-outline" size={24} color={colors.accent} />
                <ThemedText style={styles.imageButtonText}>Galeria</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.imageButton,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                ]}
                onPress={handleTakePhoto}
              >
                <Ionicons name="camera-outline" size={24} color={colors.accent} />
                <ThemedText style={styles.imageButtonText}>Câmera</ThemedText>
              </TouchableOpacity>
            </View>            {/* Exibir imagem selecionada */}
            {imageDisplay && (
              <View style={styles.selectedImageContainer}>
                <Image 
                  source={imageDisplay} 
                  style={styles.selectedImage} 
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => {
                    setImageUri(null);
                    setImageDisplay(null);
                  }}
                >
                  <Ionicons name="close-circle" size={28} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            )}
              <ThemedText style={styles.noteText}>
              {isClaimingPet 
                ? 'Nota: Suas informações de contato serão compartilhadas com o tutor do pet para facilitar o processo de devolução. O dono receberá uma notificação prioritária quando você enviar este relato.'
                : 'Nota: Sua localização será registrada para ajudar o tutor do pet a encontrá-lo. O dono receberá uma notificação quando você enviar este avistamento.'}
            </ThemedText>
          </ThemedCard>
        </ScrollView>
        
        {/* Botão de enviar - fixo na parte inferior */}
        <View style={[styles.submitButtonContainer, { backgroundColor: isDark ? colors.card : 'rgba(255,255,255,0.95)' }]}>
          <ThemedButton
            title={isClaimingPet ? "Enviar Relato" : "Enviar Avistamento"}
            textStyle={{ fontSize: 16, fontWeight: 'bold' }}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
            variant={isClaimingPet ? "secondary" : "primary"}
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

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
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  petInfoCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  petInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  petInfoContent: {
    flex: 1,
  },
  petName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  petDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  lastSeenInfo: {
    fontSize: 12,
    opacity: 0.7,
  },
  formCard: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  mapInstructions: {
    fontSize: 14,
    marginBottom: 12,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
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
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 120,
    fontFamily: FontFamily.regular,
    marginBottom: 16,
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  imageButton: {
    width: '48%',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  imageButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },  
  selectedImageContainer: {
    marginTop: 12,
    position: 'relative',
    alignSelf: 'center',
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#f0f0f0',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 14,
  },
  noteText: {
    fontSize: 13,
    fontStyle: 'italic',
    opacity: 0.7,
    marginTop: 16,
    textAlign: 'center',
  },
  submitButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  submitButton: {
    borderRadius: 24,
    paddingVertical: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});
