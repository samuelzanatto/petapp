import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Alert, 
  Platform, 
  TextInput,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/auth';
import { usePets } from '../../hooks/usePets';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/contexts/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInRight, 
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Loading } from '@/components/Loading';
import { FontFamily } from '@/constants/Fonts';

const { width } = Dimensions.get('window');

type Pet = {
  id: string;
  name: string;
  species: 'DOG' | 'CAT';
  primaryImage: string | null;
};

type Step = 'type' | 'pet' | 'details' | 'location' | 'review';

export default function ReportScreen() {
  const { user } = useAuth();
  const { pets } = usePets();
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [reportType, setReportType] = useState<'lost' | 'found'>('lost');
  const [reward, setReward] = useState('');
  const [currentStep, setCurrentStep] = useState<Step>('type');
  const [animating, setAnimating] = useState(false);
  
  // Para pet encontrado
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [petSpecies, setPetSpecies] = useState<'DOG' | 'CAT'>('DOG');
  const [description, setDescription] = useState('');

  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Valores para animações
  const progressValue = useSharedValue(0);
  const cardScale = useSharedValue(1);

  // Função para resetar o formulário para o estado inicial
  const resetForm = () => {
    setSelectedPet(null);
    setSelectedImages([]);
    setLocation(null);
    setReportType('lost');
    setReward('');
    setCurrentStep('type');
    setImageUri(null);
    setPetSpecies('DOG');
    setDescription('');
    progressValue.value = 0.2; // Redefine o progresso para a primeira etapa
  };
  
  // Definindo estilos animados fora das renderizações condicionais
  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value * 100}%`,
      backgroundColor: colors.accent
    };
  });
  
  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: cardScale.value }],
    };
  });

  useEffect(() => {
    getCurrentLocation();
    progressValue.value = getProgressValue();
  }, [currentStep]);

  const getProgressValue = () => {
    switch(currentStep) {
      case 'type': return 0.2;
      case 'pet': return 0.4;
      case 'details': return 0.6;
      case 'location': return 0.8;
      case 'review': return 1;
      default: return 0;
    }
  };

  const nextStep = () => {
    setAnimating(true);
    setTimeout(() => {
      if (currentStep === 'type') setCurrentStep('pet');
      else if (currentStep === 'pet') setCurrentStep('details');
      else if (currentStep === 'details') setCurrentStep('location');
      else if (currentStep === 'location') setCurrentStep('review');
      setAnimating(false);
    }, 300);
  };

  const prevStep = () => {
    setAnimating(true);
    setTimeout(() => {
      if (currentStep === 'review') setCurrentStep('location');
      else if (currentStep === 'location') setCurrentStep('details');
      else if (currentStep === 'details') setCurrentStep('pet');
      else if (currentStep === 'pet') setCurrentStep('type');
      setAnimating(false);
    }, 300);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos da sua localização para registrar o pet.');
        return;
      }
      
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      Alert.alert('Erro', 'Não foi possível obter sua localização atual. Verifique se o GPS está ativado.');
    }
  };

  const takePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à câmera para tirar a foto do pet.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        // Animação sutil ao selecionar uma imagem
        cardScale.value = withSpring(1.05);
        setTimeout(() => {
          cardScale.value = withSpring(1);
        }, 300);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto. Tente novamente.');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à galeria de fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        // Animação sutil ao selecionar uma imagem
        cardScale.value = withSpring(1.05);
        setTimeout(() => {
          cardScale.value = withSpring(1);
        }, 300);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem. Tente novamente.');
    }
  };

  const pickMultipleImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à galeria de fotos.');
        return;
      }
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.8,
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Limitar a 5 imagens no total
        const newImages = result.assets.map(asset => asset.uri);
        const allImages = [...selectedImages, ...newImages];
        
        if (allImages.length > 5) {
          Alert.alert('Limite atingido', 'Você pode selecionar no máximo 5 imagens.');
          setSelectedImages(allImages.slice(0, 5));
        } else {
          setSelectedImages(allImages);
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar imagens:', error);
      Alert.alert('Erro', 'Não foi possível selecionar as imagens. Tente novamente.');
    }
  };

  const removeImage = (indexToRemove: number) => {
    setSelectedImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleReportLostPet = async () => {
    if (!selectedPet) {
      Alert.alert('Erro', 'Por favor, selecione um pet para reportar como perdido.');
      return;
    }
  
    if (!location) {
      Alert.alert('Erro', 'Não conseguimos obter sua localização. Tente novamente.');
      return;
    }
  
    setLoading(true);
  
    try {
      // Criar FormData para enviar os dados e as imagens
      const formData = new FormData();
      formData.append('petId', selectedPet);
      formData.append('lastSeenLatitude', String(location.coords.latitude));
      formData.append('lastSeenLongitude', String(location.coords.longitude));
      formData.append('description', description || 'Pet perdido.');
      formData.append('lastSeenLocation', 'Localização atual');
      if (reward) formData.append('reward', String(parseFloat(reward.replace(',', '.'))));
      
      // Adicionar imagens ao FormData
      if (selectedImages.length > 0) {
        selectedImages.forEach((uri, index) => {
          const fileExtension = uri.split('.').pop() || 'jpg';
          formData.append('images', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            name: `lost_pet_image_${Date.now()}_${index}.${fileExtension}`,
            type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
          } as any);
        });
      }
      
      // Usar a função de upload em vez de post para enviar o FormData
      await api.upload('/alerts/lost', formData);

      Alert.alert(
        'Sucesso',
        'Alerta de pet perdido enviado com sucesso! Você será notificado quando alguém encontrar um pet semelhante.',
        [{ text: 'OK', onPress: () => {
          resetForm();
          router.push('/(tabs)');
        }}]
      );
    } catch (error) {
      console.error('Erro ao reportar pet perdido:', error);
      Alert.alert('Erro', 'Não foi possível enviar o alerta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleReportFoundPet = async () => {
    if (!petSpecies) {
      Alert.alert('Erro', 'Por favor, selecione a espécie do pet encontrado.');
      return;
    }

    if (!imageUri) {
      Alert.alert('Erro', 'Por favor, tire uma foto ou selecione uma imagem do pet encontrado.');
      return;
    }

    if (!location) {
      Alert.alert('Erro', 'Não conseguimos obter sua localização. Tente novamente.');
      return;
    }

    setLoading(true);

    try {
      // Criar um FormData para enviar tanto os dados quanto a imagem
      const formData = new FormData();
      formData.append('species', petSpecies);
      formData.append('description', description || 'Pet encontrado');
      formData.append('latitude', String(location.coords.latitude));
      formData.append('longitude', String(location.coords.longitude));
      
      // Anexar a imagem ao FormData
      const fileExtension = imageUri.split('.').pop() || 'jpg';
      
      formData.append('image', {
        uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
        name: `found_pet_${Date.now()}.${fileExtension}`,
        type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
      } as any);
      
      await api.upload('/alerts/found', formData);

      Alert.alert(
        'Sucesso',
        'Seu relatório de pet encontrado foi enviado com sucesso! Os tutores de pets perdidos semelhantes serão notificados.',
        [{ text: 'OK', onPress: () => {
          resetForm();
          router.push('/(tabs)');
        }}]
      );
    } catch (error) {
      console.error('Erro ao reportar pet encontrado:', error);
      Alert.alert('Erro', 'Não foi possível enviar o relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
        </View>
        <ThemedText style={styles.stepText}>
          Etapa {
            currentStep === 'type' ? '1 ' :
            currentStep === 'pet' ? '2 ' :
            currentStep === 'details' ? '3 ' :
            currentStep === 'location' ? '4 ' : '5 '
          }
          de 5
        </ThemedText>
      </View>
    );
  };

  const renderTypeStep = () => {
    return (
      <Animated.View 
        entering={FadeIn} 
        exiting={FadeOut}
        style={styles.stepContainer}
      >
        <Text style={[styles.titleText, {color: colors.text, textAlign: 'center', marginBottom: 24}]}>
          O que deseja reportar?
        </Text>
        
        <View style={styles.typeCardContainer}>
          <TouchableOpacity 
            style={[
              styles.typeCard, 
              {backgroundColor: isDark ? colors.card : colors.input},
              reportType === 'lost' && styles.selectedTypeCard,
              reportType === 'lost' && {borderColor: colors.accent, borderWidth: 2}
            ]} 
            onPress={() => setReportType('lost')}
          >
            <View style={styles.typeCardContent}>
              <View style={[
                styles.iconContainer, 
                {backgroundColor: reportType === 'lost' ? colors.accent : isDark ? colors.card : colors.background}
              ]}>
                <MaterialCommunityIcons 
                  name="dog" 
                  size={38} 
                  color={reportType === 'lost' ? colors.buttonText : colors.textSecondary} 
                />
              </View>
              <Text style={[styles.cardTitle, {color: colors.text, marginTop: 12}]}>Pet Perdido</Text>
              <ThemedText style={{textAlign: 'center', marginTop: 8}}>
                Perdeu seu pet? Publique um alerta para encontrá-lo.
              </ThemedText>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.typeCard, 
              {backgroundColor: isDark ? colors.card : colors.input},
              reportType === 'found' && styles.selectedTypeCard,
              reportType === 'found' && {borderColor: colors.accent, borderWidth: 2}
            ]} 
            onPress={() => setReportType('found')}
          >
            <View style={styles.typeCardContent}>
              <View style={[
                styles.iconContainer, 
                {backgroundColor: reportType === 'found' ? colors.accent : isDark ? colors.card : colors.background}
              ]}>
                <MaterialCommunityIcons 
                  name="map-marker-check" 
                  size={34} 
                  color={reportType === 'found' ? colors.buttonText : colors.textSecondary} 
                />
              </View>
              <Text style={[styles.cardTitle, {color: colors.text, marginTop: 12}]}>Pet Encontrado</Text>
              <ThemedText style={{textAlign: 'center', marginTop: 8}}>
                Encontrou um pet perdido? Ajude-o a voltar para casa.
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.button, {backgroundColor: colors.accent, marginTop: 24}]}
          onPress={nextStep}
        >
          <Text style={styles.buttonText}>Continuar</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderPetStep = () => {
    if (reportType === 'lost') {
      return (
        <Animated.View 
          entering={SlideInRight} 
          exiting={SlideOutLeft}
          style={styles.stepContainer}
        >
          <Text style={[styles.titleText, {color: colors.text, marginBottom: 16}]}>
            Qual pet você perdeu?
          </Text>
          
          {pets.length === 0 ? (
            <View style={styles.noPetsContainer}>
              <ThemedText style={{textAlign: 'center', marginBottom: 16}}>
                Você ainda não tem pets cadastrados. Cadastre um pet para poder reportá-lo como perdido.
              </ThemedText>
              <TouchableOpacity
                style={[styles.button, {backgroundColor: colors.success}]}
                onPress={() => router.push('/pet/create')}
              >
                <Ionicons name="add-circle-outline" size={20} color="white" style={{marginRight: 8}} />
                <Text style={styles.buttonText}>Cadastrar Pet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{width: '100%'}}>
              <View style={styles.petsGrid}>
                {pets.map(pet => (
                  <TouchableOpacity
                    key={pet.id}
                    style={[
                      styles.petCardModern,
                      {backgroundColor: isDark ? colors.card : colors.input},
                      selectedPet === pet.id && {
                        borderColor: colors.accent,
                        borderWidth: 2,
                        transform: [{scale: 1}]
                      }
                    ]}
                    onPress={() => setSelectedPet(pet.id)}
                  >
                    <Image
                      source={
                        pet.primaryImage
                          ? { uri: pet.primaryImage }
                          : require('../../assets/images/default-pet.png')
                      }
                      style={styles.petImageModern}
                    />
                    <View style={styles.petBadge}>
                      <ThemedText style={styles.petBadgeText}>
                        {pet.species === 'DOG' ? '🐶' : '🐱'}
                      </ThemedText>
                    </View>
                    
                    <View style={styles.petInfoContainer}>
                      <Text style={[styles.petNameModern, {color: colors.text}]}>
                        {pet.name}
                      </Text>
                      {selectedPet === pet.id && (
                        <View style={styles.selectedCheck}>
                          <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
          
          <View style={styles.stepButtons}>
            <TouchableOpacity 
              style={[styles.buttonSecondary, {flex: 1, marginRight: 8, borderColor: colors.border}]}
              onPress={prevStep}
            >
              <Text style={{color: colors.text}}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.button, 
                {flex: 1, marginLeft: 8, backgroundColor: colors.accent},
                (!selectedPet && pets.length > 0) && {backgroundColor: colors.disabled}
              ]}
              onPress={nextStep}
              disabled={!selectedPet && pets.length > 0}
            >
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      );
    } else {
      return (
        <Animated.View 
          entering={SlideInRight} 
          exiting={SlideOutLeft}
          style={styles.stepContainer}
        >
          <Text style={[styles.titleText, {color: colors.text, marginBottom: 24}]}>
            Que tipo de pet você encontrou?
          </Text>
          
          <View style={styles.speciesSelectorModern}>
            <TouchableOpacity 
              style={[
                styles.speciesCardModern,
                {backgroundColor: isDark ? colors.card : colors.input},
                petSpecies === 'DOG' && {
                  borderColor: colors.accent,
                  borderWidth: 2
                }
              ]}
              onPress={() => setPetSpecies('DOG')}
            >
              <View style={[
                styles.speciesIconContainer,
                {backgroundColor: petSpecies === 'DOG' ? colors.accent : isDark ? colors.card : colors.input}
              ]}>
                <FontAwesome5 
                  name="dog" 
                  size={38} 
                  color={petSpecies === 'DOG' ? colors.buttonText : colors.textSecondary} 
                />
              </View>
              <Text style={[styles.cardTitle, {color: colors.text, marginTop: 16, textAlign: 'center'}]}>
                Cachorro
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.speciesCardModern,
                {backgroundColor: isDark ? colors.card : colors.input},
                petSpecies === 'CAT' && {
                  borderColor: colors.accent,
                  borderWidth: 2
                }
              ]}
              onPress={() => setPetSpecies('CAT')}
            >
              <View style={[
                styles.speciesIconContainer,
                {backgroundColor: petSpecies === 'CAT' ? colors.accent : isDark ? colors.card : colors.input}
              ]}>
                <FontAwesome5 
                  name="cat" 
                  size={38} 
                  color={petSpecies === 'CAT' ? colors.buttonText : colors.textSecondary} 
                />
              </View>
              <Text style={[styles.cardTitle, {color: colors.text, marginTop: 16, textAlign: 'center'}]}>
                Gato
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.stepButtons}>
            <TouchableOpacity 
              style={[styles.buttonSecondary, {flex: 1, marginRight: 8, borderColor: colors.border}]}
              onPress={prevStep}
            >
              <Text style={{color: colors.text}}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, {flex: 1, marginLeft: 8, backgroundColor: colors.accent}]}
              onPress={nextStep}
            >
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      );
    }
  };
  
  const renderDetailsStep = () => {
    if (reportType === 'lost') {
      return (
        <Animated.View 
          entering={SlideInRight} 
          exiting={SlideOutLeft}
          style={styles.stepContainer}
        >
          <Text style={[styles.titleText, {color: colors.text, marginBottom: 24}]}>
            Informações adicionais
          </Text>
          
          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitle, {color: colors.text, marginBottom: 16}]}>Recompensa</Text>
            <View style={styles.rewardInputContainer}>
              <View style={[styles.currencyContainer, {backgroundColor: 'rgba(0,0,0,0.05)'}]}>
                <ThemedText style={styles.currencySymbolModern}>R$</ThemedText>
              </View>
              <TextInput
                style={[
                  styles.rewardInputModern, 
                  { 
                    borderColor: colors.border,
                    backgroundColor: isDark ? colors.card : colors.input,
                    color: colors.text
                  }
                ]}
                value={reward}
                onChangeText={(text) => setReward(text.replace(/[^0-9.,]/g, ''))}
                placeholder="0,00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
            <ThemedText style={styles.helperText}>
              Uma recompensa pode aumentar as chances de encontrar seu pet
            </ThemedText>
          </View>
          
          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitle, {color: colors.text, marginBottom: 16}]}>Fotos adicionais</Text>
            <ThemedText style={styles.helperText}>
              Adicione mais fotos do seu pet para facilitar o reconhecimento
            </ThemedText>
            
            <View style={styles.imagesContainerModern}>
              {selectedImages.map((uri, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.imagePreviewModern, 
                    { borderColor: colors.border }
                  ]}
                >
                  <Image source={{ uri }} style={styles.smallImagePreview} />
                  <TouchableOpacity 
                    style={styles.removeImageButtonModern}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              
              {selectedImages.length < 5 && (
                <TouchableOpacity 
                  style={[
                    styles.addImageButtonModern,
                    { 
                      borderColor: colors.border, 
                      backgroundColor: isDark ? colors.card : colors.input 
                    }
                  ]}
                  onPress={pickMultipleImages}
                >
                  <Ionicons name="add" size={32} color={colors.textTertiary} />
                  <ThemedText style={styles.addPhotoText}>
                    {selectedImages.length === 0 ? "Adicionar fotos" : "Mais fotos"}
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitle, {color: colors.text, marginBottom: 16}]}>Descrição</Text>
            <TextInput
              style={[
                styles.descriptionInputModern, 
                { 
                  borderColor: colors.border,
                  backgroundColor: isDark ? colors.card : colors.input,
                  color: colors.text
                }
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Descreva onde, quando e como perdeu seu pet..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
            />
          </View>
          
          <View style={styles.stepButtons}>
            <TouchableOpacity 
              style={[styles.buttonSecondary, {flex: 1, marginRight: 8, borderColor: colors.border}]}
              onPress={prevStep}
            >
              <Text style={{color: colors.text}}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, {flex: 1, marginLeft: 8, backgroundColor: colors.accent}]}
              onPress={nextStep}
            >
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      );
    } else {
      return (
        <Animated.View 
          entering={SlideInRight} 
          exiting={SlideOutLeft}
          style={styles.stepContainer}
        >
          <Text style={[styles.titleText, {color: colors.text, marginBottom: 24}]}>
            Foto do pet encontrado
          </Text>
          
          <Animated.View style={[
            styles.foundPetImageContainer,
            animatedCardStyle
          ]}>
            {imageUri ? (
              <View style={styles.imagePreviewContainerModern}>
                <Image source={{ uri: imageUri }} style={styles.imagePreviewModern} />
                <TouchableOpacity 
                  style={[styles.buttonSecondary, styles.changePhotoButtonModern, {borderColor: colors.border}]}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="camera" size={18} color={colors.text} style={{marginRight: 8}} />
                  <Text style={{color: colors.text}}>Alterar foto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoOptionsContainer}>
                <TouchableOpacity 
                  style={[styles.buttonSecondary, {marginBottom: 16, borderColor: colors.border}]}
                  onPress={takePicture}
                >
                  <Ionicons name="camera" size={18} color={colors.text} style={{marginRight: 8}} />
                  <Text style={{color: colors.text}}>Tirar Foto</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.buttonSecondary, {borderColor: colors.border}]}
                  onPress={pickImage}
                >
                  <Ionicons name="images" size={18} color={colors.text} style={{marginRight: 8}} />
                  <Text style={{color: colors.text}}>Escolher da Galeria</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
          
          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitle, {color: colors.text, marginBottom: 16}]}>Descrição</Text>
            <TextInput
              style={[
                styles.descriptionInputModern, 
                { 
                  borderColor: colors.border,
                  backgroundColor: isDark ? colors.card : colors.input,
                  color: colors.text
                }
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Descreva onde, quando e como você encontrou o pet..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
            />
          </View>
          
          <View style={styles.stepButtons}>
            <TouchableOpacity 
              style={[styles.buttonSecondary, {flex: 1, marginRight: 8, borderColor: colors.border}]}
              onPress={prevStep}
            >
              <Text style={{color: colors.text}}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.button, 
                {flex: 1, marginLeft: 8, backgroundColor: colors.accent},
                !imageUri && {backgroundColor: colors.disabled}
              ]}
              onPress={nextStep}
              disabled={!imageUri}
            >
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      );
    }
  };
  
  const renderLocationStep = () => {
    return (
      <Animated.View 
        entering={SlideInRight} 
        exiting={SlideOutLeft}
        style={styles.stepContainer}
      >
        <Text style={[styles.titleText, {color: colors.text, marginBottom: 24}]}>
          Localização
        </Text>
        
        <View style={[styles.locationCardModern, {backgroundColor: isDark ? colors.card : colors.input}]}>
          <View style={styles.locationContentModern}>
            <View style={styles.locationTextContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons 
                    name="map-marker" 
                    size={24} 
                    color={location ? colors.accent : colors.error} 
                />
                <Text style={[styles.sectionTitle, {color: colors.text}]}>
                  Sua localização atual
                </Text>
              </View>
              
              {location ? (
                <View style={styles.locationStatusContainer}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                  <ThemedText style={[styles.locationStatusText, { color: colors.text }]}>
                    Localização capturada com sucesso
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.locationStatusContainer}>
                  <Ionicons name="alert-circle" size={20} color={colors.error} />
                  <ThemedText style={[styles.locationStatusText, { color: colors.error }]}>
                    Não foi possível capturar sua localização
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
          
          {!location && (
            <TouchableOpacity 
              style={[styles.button, {backgroundColor: colors.info, marginTop: 16}]}
              onPress={getCurrentLocation}
            >
              <Ionicons name="location" size={18} color="white" style={{marginRight: 8}} />
              <Text style={styles.buttonText}>Obter Localização</Text>
            </TouchableOpacity>
          )}
          
          <ThemedText style={styles.locationHelperText}>
            Esta localização será usada para identificar onde o pet foi 
            {reportType === 'lost' ? ' perdido' : ' encontrado'}
          </ThemedText>
        </View>
        
        <View style={styles.stepButtons}>
          <TouchableOpacity 
            style={[styles.buttonSecondary, {flex: 1, marginRight: 8, borderColor: colors.border}]}
            onPress={prevStep}
          >
            <Text style={{color: colors.text}}>Voltar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.button, 
              {flex: 1, marginLeft: 8, backgroundColor: colors.accent},
              !location && {backgroundColor: colors.disabled}
            ]}
            onPress={nextStep}
            disabled={!location}
          >
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };
  
  const renderReviewStep = () => {
    return (
      <Animated.View 
        entering={SlideInRight} 
        exiting={SlideOutLeft}
        style={styles.stepContainer}
      >
        <Text style={[styles.titleText, {color: colors.text, marginBottom: 24}]}>
          Revisar e enviar
        </Text>
        
        <View style={[styles.reviewCardModern, {backgroundColor: isDark ? colors.card : colors.input}]}>
          <Text style={[styles.sectionTitle, {color: colors.text, marginBottom: 16}]}>
            {reportType === 'lost' ? 'Pet Perdido' : 'Pet Encontrado'}
          </Text>
          
          {reportType === 'lost' ? (
            <View style={styles.reviewDetails}>
              <View style={styles.reviewRow}>
                <ThemedText style={styles.reviewLabel}>Pet:</ThemedText>
                <ThemedText style={styles.reviewValue}>
                  {pets.find(pet => pet.id === selectedPet)?.name || ''}
                </ThemedText>
              </View>
              {reward ? (
                <View style={styles.reviewRow}>
                  <ThemedText style={styles.reviewLabel}>Recompensa:</ThemedText>
                  <ThemedText style={styles.reviewValue}>R$ {reward}</ThemedText>
                </View>
              ) : null}
              <View style={styles.reviewRow}>
                <ThemedText style={styles.reviewLabel}>Fotos adicionais:</ThemedText>
                <ThemedText style={styles.reviewValue}>
                  {selectedImages.length || 'Nenhuma'}
                </ThemedText>
              </View>
              {description ? (
                <View style={styles.reviewRow}>
                  <ThemedText style={styles.reviewLabel}>Descrição:</ThemedText>
                  <ThemedText style={[styles.reviewValue, styles.reviewDescription]}>
                    {description}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.reviewDetails}>
              <View style={styles.reviewRow}>
                <ThemedText style={styles.reviewLabel}>Espécie:</ThemedText>
                <ThemedText style={styles.reviewValue}>
                  {petSpecies === 'DOG' ? 'Cachorro' : 'Gato'}
                </ThemedText>
              </View>
              {description ? (
                <View style={styles.reviewRow}>
                  <ThemedText style={styles.reviewLabel}>Descrição:</ThemedText>
                  <ThemedText style={[styles.reviewValue, styles.reviewDescription]}>
                    {description}
                  </ThemedText>
                </View>
              ) : null}
              {imageUri && (
                <View style={styles.reviewImageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.reviewImage} />
                </View>
              )}
            </View>
          )}
        </View>
        
        <ThemedText style={styles.privacyNote}>
          Ao enviar este relatório, você concorda em compartilhar a localização e as informações fornecidas
          com usuários que possam ter {reportType === 'lost' ? 'encontrado' : 'perdido'} este pet.
        </ThemedText>
        
        <View style={styles.stepButtons}>
          <TouchableOpacity 
            style={[styles.buttonSecondary, {flex: 1, marginRight: 8, borderColor: colors.border}]}
            onPress={prevStep}
          >
            <Text style={{color: colors.text}}>Voltar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, {flex: 1, marginLeft: 8, backgroundColor: colors.accent}]}
            onPress={reportType === 'lost' ? handleReportLostPet : handleReportFoundPet}
            disabled={loading}
          >
            {loading ? (
              <Loading size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {reportType === 'lost' ? 'Reportar Pet Perdido' : 'Reportar Pet Encontrado'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'type':
        return renderTypeStep();
      case 'pet':
        return renderPetStep();
      case 'details':
        return renderDetailsStep();
      case 'location':
        return renderLocationStep();
      case 'review':
        return renderReviewStep();
      default:
        return null;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingTop: Platform.OS === 'ios' ? 10 : 16,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    closeButton: {
      padding: 8,
    },
    contentContainer: {
      flex: 1,
    },
    contentInner: {
      padding: 20,
      paddingBottom: 140,
    },
    progressContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    progressBar: {
      height: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#E0E0E0',
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    stepText: {
      textAlign: 'right',
      fontSize: 14,
      opacity: 0.7,
      fontFamily: FontFamily.medium,
    },
    stepContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: '100%',
    },
    titleText: {
      fontSize: 24,
      fontFamily: FontFamily.bold,
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontFamily: FontFamily.bold,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: FontFamily.bold,
    },
    typeCardContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 16,
    },
    typeCard: {
      width: '48%',
      padding: 16,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    selectedTypeCard: {
      elevation: 4,
      shadowColor: colors.accent,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    typeCardContent: {
      padding: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainer: {
      width: 70,
      height: 70,
      borderRadius: 35,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 16,
      elevation: 2,
    },
    buttonSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 16,
      borderWidth: 1,
      backgroundColor: 'transparent',
    },
    buttonText: {
      color: 'white',
      fontFamily: FontFamily.bold,
      fontSize: 16,
      textAlign: 'center',
    },
    stepButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 24,
    },
    noPetsContainer: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      marginTop: 20,
    },
    petsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      width: '100%',
      paddingBottom: 16,
    },
    petCardModern: {
      width: '48%',
      marginBottom: 16,
      overflow: 'hidden',
      padding: 0,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 1)',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    petImageModern: {
      width: '100%',
      height: 120,
      resizeMode: 'cover',
    },
    petBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.5,
      elevation: 2,
    },
    petBadgeText: {
      fontSize: 16,
    },
    petInfoContainer: {
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    petNameModern: {
      fontSize: 16,
      fontFamily: FontFamily.bold,
      flex: 1,
    },
    selectedCheck: {
      marginLeft: 8,
    },
    speciesSelectorModern: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginVertical: 16,
    },
    speciesCardModern: {
      width: '48%',
      padding: 16,
      alignItems: 'center',
      borderRadius: 16,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    speciesIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailsSection: {
      width: '100%',
      marginBottom: 24,
    },
    rewardInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    currencyContainer: {
      height: 50,
      width: 50,
      justifyContent: 'center',
      alignItems: 'center',
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    },
    currencySymbolModern: {
      fontSize: 18,
      fontFamily: FontFamily.bold,
    },
    rewardInputModern: {
      flex: 1,
      height: 50,
      borderWidth: 1,
      paddingHorizontal: 12,
      fontSize: 16,
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
      borderLeftWidth: 0,
      fontFamily: FontFamily.regular,
    },
    helperText: {
      fontSize: 14,
      opacity: 0.7,
      marginTop: 6,
      fontFamily: FontFamily.regular,
    },
    imagesContainerModern: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 12,
    },
    smallImagePreview: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    removeImageButtonModern: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(255,255,255,0.8)',
      borderRadius: 12,
    },
    addImageButtonModern: {
      width: width / 3 - 16,
      height: width / 3 - 16,
      borderRadius: 8,
      borderStyle: 'dashed',
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addPhotoText: {
      fontSize: 12,
      marginTop: 4,
      fontFamily: FontFamily.medium,
    },
    descriptionInputModern: {
      width: '100%',
      minHeight: 100,
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
      textAlignVertical: 'top',
      fontSize: 16,
      fontFamily: FontFamily.regular,
    },
    foundPetImageContainer: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 24,
    },
    imagePreviewContainerModern: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 16,
    },
    imagePreviewModern: {
      width: '100%',
      height: 200,
      borderRadius: 16,
      marginBottom: 16,
      resizeMode: 'cover',
    },
    changePhotoButtonModern: {
      marginTop: 8,
    },
    photoOptionsContainer: {
      width: '100%',
      padding: 24,
      alignItems: 'center',
    },
    locationCardModern: {
      width: '100%',
      padding: 16,
      marginBottom: 24,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 0.8)',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    locationContentModern: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    locationIconContainer: {
      marginRight: 16,
      padding: 8,
    },
    locationTextContainer: {
      flex: 1,
    },
    locationStatusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
        marginTop: 4,
    },
    locationStatusText: {
      marginLeft: 6,
      fontFamily: FontFamily.medium,
    },
    locationHelperText: {
      fontSize: 14,
      opacity: 0.7,
      marginTop: 16,
      textAlign: 'center',
      fontFamily: FontFamily.regular,
    },
    reviewCardModern: {
      width: '100%',
      padding: 16,
      marginBottom: 24,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 0.8)',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    reviewDetails: {
      width: '100%',
    },
    reviewRow: {
      flexDirection: 'row',
      marginBottom: 12,
      alignItems: 'flex-start',
    },
    reviewLabel: {
      width: 150,
      fontFamily: FontFamily.bold,
    },
    reviewValue: {
      flex: 1,
      fontFamily: FontFamily.regular,
    },
    reviewDescription: {
      marginTop: 2,
    },
    reviewImageContainer: {
      width: '100%',
      marginTop: 16,
    },
    reviewImage: {
      width: '100%',
      height: 180,
      borderRadius: 16,
      resizeMode: 'cover',
    },
    privacyNote: {
      fontSize: 14,
      opacity: 0.7,
      marginBottom: 24,
      textAlign: 'center',
      fontFamily: FontFamily.regular,
    },
  });
  
  return (
    <SafeAreaView style={[
      styles.container, 
      { 
        backgroundColor: isDark ? '#121212' : '#F8F8F8',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right 
      }
    ]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Reportar Pet</Text>
        
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => {
            Alert.alert(
              'Cancelar relatório',
              'Tem certeza que deseja cancelar este relatório? Todas as informações serão perdidas.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { 
                  text: 'Sim', 
                  onPress: () => {
                    resetForm();
                    router.back();
                  } 
                }
              ]
            );
          }}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      {renderStepIndicator()}
      
      <ScrollView 
        style={styles.contentContainer}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentStep()}
      </ScrollView>
    </SafeAreaView>
  );
}