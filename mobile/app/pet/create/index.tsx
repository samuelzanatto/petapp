import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { TextInput, Switch, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Pet = {
  id: string;
  name: string;
  species: 'DOG' | 'CAT';
  breed: string | null;
  nickname: string | null;
  birthDate: string | null;
  gender: 'MALE' | 'FEMALE' | null;
  color: string | null;
  coatType: string | null;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | null;
  weight: number | null;
  description: string | null;
  primaryImage: string | null;
  images: string[];
  isNeutered: boolean;
  hasSpecialNeeds: boolean;
  specialNeedsDescription: string | null;
  microchipNumber: string | null;
  medication: string | null;
  specialDiet: string | null;
};

export default function CreateEditPet() {
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();
  const petId = params.id as string | undefined;
  const isEditing = !!petId;

  // Configuração do tema para React Native Paper (adicionado do perfil)
  const paperTheme = isDark 
  ? {
      ...MD3DarkTheme,
      colors: {
        ...MD3DarkTheme.colors,
        primary: colors.accent,
        background: colors.card,
        surface: colors.card,
        onSurface: colors.text,
        outline: colors.border,
      }
    }
  : {
      ...MD3LightTheme,
      colors: {
        ...MD3LightTheme.colors,
        primary: colors.accent,
        background: colors.background,
        surface: colors.card,
        onSurface: colors.text,
        outline: colors.border,
      }
    };
  
  // Estados para informações básicas do pet
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [species, setSpecies] = useState<'DOG' | 'CAT'>('DOG');
  const [breed, setBreed] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | null>(null);
  const [color, setColor] = useState('');
  const [coatType, setCoatType] = useState('');
  const [size, setSize] = useState<'SMALL' | 'MEDIUM' | 'LARGE' | null>(null);
  const [weight, setWeight] = useState('');
  const [description, setDescription] = useState('');
  
  // Estados para informações médicas
  const [isNeutered, setIsNeutered] = useState(false);
  const [hasSpecialNeeds, setHasSpecialNeeds] = useState(false);
  const [specialNeedsDescription, setSpecialNeedsDescription] = useState('');
  const [microchipNumber, setMicrochipNumber] = useState('');
  const [medication, setMedication] = useState('');
  const [specialDiet, setSpecialDiet] = useState('');
  
  // Estados para imagens
  const [images, setImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  
  // Estados para controle da UI
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    details: true,
    medical: true,
  });
  
  useEffect(() => {
    if (isEditing) {
      fetchPetDetails();
    }
  }, [petId]);
  
  const fetchPetDetails = async () => {
    try {
      setInitialLoading(true);

      // Obter token diretamente do AsyncStorage
      const token = await AsyncStorage.getItem('userToken');

      // Adicionar log para depuração
      console.log(`Buscando detalhes do pet ID: ${petId}`);

      const response = await fetch(`${api.BASE_URL}/pets/${petId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Não foi possível obter os detalhes do pet');
      }
      
      const pet: Pet = await response.json();
      
      // Carregar informações básicas - corrigindo mapeamento de campos
      setName(pet.name || '');
      setNickname(pet.nickname || '');
      setSpecies(pet.species || 'DOG');
      setBreed(pet.breed || '');
      
    // Corrigir problema da data
      if (pet.birthDate) {
        if (pet.birthDate) {
          console.log('Data recebida:', pet.birthDate);
          setBirthDate(new Date(pet.birthDate));
        }
      }

      // Corrigir campo de gênero
      setGender(pet.gender);
      console.log('Gênero recebido:', pet.gender);

      // Corrigir campo de cor
      setColor(pet.color || '');

      // Corrigir campo de pelagem
      setCoatType(pet.coatType || '');

      // Demais campos
      setSize(pet.size);
      setWeight(pet.weight ? String(pet.weight) : '');
      setDescription(pet.description || '');

      // Carregar informações médicas
      setIsNeutered(pet.isNeutered || false);
      setHasSpecialNeeds(pet.hasSpecialNeeds || false);
      setSpecialNeedsDescription(pet.specialNeedsDescription || '');
      setMicrochipNumber(pet.microchipNumber || '');
      setMedication(pet.medication || '');
      setSpecialDiet(pet.specialDiet || '');
      
      // Carregar imagens
      const allImages = [];
      if (pet.primaryImage) {
        // Verificar se a URL já está completa
        const primaryImageUrl = pet.primaryImage.startsWith('http') 
          ? pet.primaryImage 
          : `${api.BASE_URL}/uploads/pets/${pet.primaryImage}`;
        
        allImages.push(primaryImageUrl);
        // Definir imagem primária como a primeira
        setPrimaryImageIndex(0);
      }
      
      // Adicionar outras imagens
      if (pet.images && Array.isArray(pet.images)) {
        pet.images.forEach(img => {
          if (img !== pet.primaryImage) {
            const imageUrl = img.startsWith('http') 
              ? img 
              : `${api.BASE_URL}/uploads/pets/${img}`;
            
            allImages.push(imageUrl);
          }
        });
      }
      
      setImages(allImages);
    } catch (error) {
      console.error('Erro ao obter detalhes do pet:', error);
      Alert.alert(
        'Erro', 
        'Não foi possível carregar os detalhes do pet. Tente novamente.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setInitialLoading(false);
    }
  };
  
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };
  
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Erro', 'Precisamos de permissão para acessar suas fotos');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImages(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem. Tente novamente.');
    }
  };
  
  const removeImage = (index: number) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
    
    // Ajustar o índice da imagem primária se necessário
    if (index === primaryImageIndex) {
      setPrimaryImageIndex(updatedImages.length > 0 ? 0 : -1);
    } else if (index < primaryImageIndex) {
      setPrimaryImageIndex(primaryImageIndex - 1);
    }
  };
  
  const setPrimaryImage = (index: number) => {
    setPrimaryImageIndex(index);
  };
  
  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome do pet é obrigatório');
      return false;
    }
    
    if (images.length === 0) {
      Alert.alert('Erro', 'Pelo menos uma imagem é necessária');
      return false;
    }
    
    if (hasSpecialNeeds && !specialNeedsDescription.trim()) {
      Alert.alert('Erro', 'Por favor, descreva as necessidades especiais do pet');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
        // Informações básicas
      formData.append('name', name);
      formData.append('species', species);
      if (nickname) formData.append('nickname', nickname);
      if (breed) formData.append('breed', breed);
      if (birthDate) formData.append('birthDate', birthDate.toISOString());
      if (gender) formData.append('gender', gender);
      if (color) formData.append('color', color);
      if (coatType) formData.append('coatType', coatType);
      if (size) formData.append('size', size);
      if (weight) formData.append('weight', weight);
      if (description) formData.append('description', description);
      
      // Informações médicas
      formData.append('isNeutered', String(isNeutered));
      formData.append('hasSpecialNeeds', String(hasSpecialNeeds));
      if (specialNeedsDescription) formData.append('specialNeedsDescription', specialNeedsDescription);
      if (microchipNumber) formData.append('microchipNumber', microchipNumber);
      if (medication) formData.append('medication', medication);
      if (specialDiet) formData.append('specialDiet', specialDiet);
      
      // Marcar a imagem primária
      if (primaryImageIndex >= 0 && primaryImageIndex < images.length) {
        formData.append('primaryImageIndex', String(primaryImageIndex));
      }
      
      // Adicionar imagens (apenas novas imagens sem URLs http)
      images.forEach((image, index) => {
        if (!image.startsWith('http')) {
          const fileExtension = image.split('.').pop() || 'jpg';
          formData.append('images', {
            uri: image,
            name: `pet_${Date.now()}_${index}.${fileExtension}`,
            type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
          } as any);
        }
      });
      
      // Obter token
      const token = await AsyncStorage.getItem('userToken');
      
      // Fazer requisição
      const url = isEditing 
        ? `${api.BASE_URL}/pets/${petId}` 
        : `${api.BASE_URL}/pets`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Erro ao salvar o pet');
      }
      
      const savedPet = await response.json();
      
      Alert.alert(
        'Sucesso', 
        `Pet ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`,
        [{ text: 'OK', onPress: () => router.replace(`/pet/${savedPet.id}`) }]
      );
    } catch (error: any) {
      console.error('Erro ao salvar pet:', error);
      Alert.alert('Erro', error.message || `Não foi possível ${isEditing ? 'atualizar' : 'cadastrar'} o pet`);
    } finally {
      setLoading(false);
    }
  };
  
  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <ThemedText style={styles.loadingText}>Carregando informações do pet...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }
    return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>      
      <View style={[styles.header, { 
        backgroundColor: colors.background,
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle} color={colors.textHeader}>
          {isEditing ? 'Editar Pet' : 'Novo Pet'}
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        >          {/* Seção de imagens */}
          <View style={styles.imagesSection}>
            <ThemedText style={styles.sectionLabel}>Fotos do Pet</ThemedText>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagesContainer}
            >
              {images.map((image, index) => (
                <View key={index} style={[styles.imageContainer, {
                  borderRadius: 16,
                  shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.25 : 0.1,
                  shadowRadius: 6,
                  elevation: 4,
                  backgroundColor: colors.card
                }]}>
                  <Image source={{ uri: image }} style={[styles.petImage, { borderRadius: 16 }]} />
                  
                  <View style={styles.imageActions}>
                    <TouchableOpacity 
                      style={[
                        styles.imageAction,
                        primaryImageIndex === index && { backgroundColor: colors.accent }
                      ]}
                      onPress={() => setPrimaryImage(index)}
                    >
                      <Ionicons 
                        name={primaryImageIndex === index ? "star" : "star-outline"} 
                        size={18} 
                        color={primaryImageIndex === index ? "#FFF" : "#555"} 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.imageAction, styles.removeImageAction]}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                  
                  {primaryImageIndex === index && (
                    <View style={[styles.primaryBadge, { backgroundColor: colors.accent }]}>
                      <ThemedText style={styles.primaryBadgeText}>Principal</ThemedText>
                    </View>
                  )}
                </View>
              ))}
              
              <TouchableOpacity 
                style={[styles.addImageButton, { 
                  borderRadius: 16,
                  borderColor: colors.divider,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.input
                }]}
                onPress={pickImage}
              >
                <Ionicons name="camera-outline" size={32} color={colors.textTertiary} />
                <ThemedText style={[styles.addImageText, { color: colors.textTertiary }]}>
                  Adicionar Foto
                </ThemedText>
              </TouchableOpacity>
            </ScrollView>
              <View style={styles.imageHelpContainer}>
              <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
              <ThemedText style={[styles.imageHelpText, { color: colors.textTertiary }]}>
                Adicione até 5 fotos do seu pet. A foto marcada como principal será a primeira a aparecer nos alertas e perfil do seu pet.
              </ThemedText>
            </View>
          </View>
          
          {/* Seção de informações básicas */}
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
              onPress={() => toggleSection('basic')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="paw-outline" size={22} color={colors.accent} style={styles.sectionIcon} />
                <ThemedText style={styles.sectionTitle}>
                  Informações Básicas
                </ThemedText>
              </View>
              <Ionicons 
                name={expandedSections.basic ? "chevron-up" : "chevron-down"} 
                size={22} 
                color={colors.text} 
              />
            </TouchableOpacity>
            
            {expandedSections.basic && (
              <View style={styles.sectionContent}>                <TextInput
                  label="Nome do Pet *"
                  value={name}
                  onChangeText={setName}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                />
                
                <TextInput
                  label="Apelido"
                  value={nickname}
                  onChangeText={setNickname}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                />
                
                <View style={styles.radioGroup}>
                  <ThemedText style={styles.radioGroupLabel}>Espécie *</ThemedText>
                  <View style={styles.radioOptions}>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        species === 'DOG' && [styles.radioOptionSelected, { backgroundColor: `${colors.accent}20` }],
                        { borderColor: isDark ? colors.border : 'rgba(0,0,0,0.1)' }
                      ]}
                      onPress={() => setSpecies('DOG')}
                    >
                      <Ionicons 
                        name={species === 'DOG' ? "radio-button-on" : "radio-button-off"} 
                        size={18} 
                        color={colors.accent} 
                      />
                      <ThemedText style={styles.radioOptionText}>Cachorro 🐶</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        species === 'CAT' && [styles.radioOptionSelected, { backgroundColor: `${colors.accent}20` }],
                        { borderColor: isDark ? colors.border : 'rgba(0,0,0,0.1)' }
                      ]}
                      onPress={() => setSpecies('CAT')}
                    >
                      <Ionicons 
                        name={species === 'CAT' ? "radio-button-on" : "radio-button-off"} 
                        size={18} 
                        color={colors.accent} 
                      />
                      <ThemedText style={styles.radioOptionText}>Gato 🐱</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <TextInput
                  label="Raça"
                  value={breed}
                  onChangeText={setBreed}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                />
                
                <TouchableOpacity 
                  style={[styles.dateInput, { 
                    borderColor: colors.border,
                    backgroundColor: isDark ? colors.card : '#fff',
                    borderRadius: 8
                  }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <ThemedText style={[styles.dateInputLabel, { color: colors.textHeader }]}>
                    Data de Nascimento
                  </ThemedText>
                  {birthDate ? (
                    <ThemedText style={styles.dateText}>
                      {birthDate.toLocaleDateString('pt-BR')}
                    </ThemedText>
                  ) : (
                    <ThemedText style={[styles.dateTextPlaceholder, { color: colors.textTertiary }]}>
                      Selecione uma data
                    </ThemedText>
                  )}
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={birthDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>
            )}
          </ThemedCard>
          
          {/* Seção de detalhes */}
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
                <Ionicons name="list-outline" size={22} color={colors.accent} style={styles.sectionIcon} />
                <ThemedText style={styles.sectionTitle}>
                  Características
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
                <View style={styles.radioGroup}>
                  <ThemedText style={styles.radioGroupLabel}>Gênero</ThemedText>
                  <View style={styles.radioOptions}>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        gender === 'MALE' && [styles.radioOptionSelected, { backgroundColor: `${colors.accent}20` }],
                        { borderColor: isDark ? colors.border : 'rgba(0,0,0,0.1)' }
                      ]}
                      onPress={() => setGender('MALE')}
                    >
                      <Ionicons 
                        name={gender === 'MALE' ? "radio-button-on" : "radio-button-off"} 
                        size={18} 
                        color={colors.accent} 
                      />
                      <ThemedText style={styles.radioOptionText}>Macho ♂</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        gender === 'FEMALE' && [styles.radioOptionSelected, { backgroundColor: `${colors.accent}20` }],
                        { borderColor: isDark ? colors.border : 'rgba(0,0,0,0.1)' }
                      ]}
                      onPress={() => setGender('FEMALE')}
                    >
                      <Ionicons 
                        name={gender === 'FEMALE' ? "radio-button-on" : "radio-button-off"} 
                        size={18} 
                        color={colors.accent}
                      />
                      <ThemedText style={styles.radioOptionText}>Fêmea ♀</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <TextInput
                  label="Cor Predominante"
                  value={color}
                  onChangeText={setColor}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                />
                
                <TextInput
                  label="Tipo de Pelagem"
                  value={coatType}
                  onChangeText={setCoatType}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                  placeholder="Ex: Curta, Longa, Encaracolada"
                />
                
                <View style={styles.radioGroup}>
                  <ThemedText style={styles.radioGroupLabel}>Tamanho</ThemedText>
                  <View style={styles.radioOptions}>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        size === 'SMALL' && [styles.radioOptionSelected, { backgroundColor: `${colors.accent}20` }],
                        { borderColor: isDark ? colors.border : 'rgba(0,0,0,0.1)' }
                      ]}
                      onPress={() => setSize('SMALL')}
                    >
                      <Ionicons 
                        name={size === 'SMALL' ? "radio-button-on" : "radio-button-off"} 
                        size={18} 
                        color={colors.accent}
                      />
                      <ThemedText style={styles.radioOptionText}>Pequeno</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        size === 'MEDIUM' && [styles.radioOptionSelected, { backgroundColor: `${colors.accent}20` }],
                        { borderColor: isDark ? colors.border : 'rgba(0,0,0,0.1)' }
                      ]}
                      onPress={() => setSize('MEDIUM')}
                    >
                      <Ionicons 
                        name={size === 'MEDIUM' ? "radio-button-on" : "radio-button-off"} 
                        size={18} 
                        color={colors.accent}
                      />
                      <ThemedText style={styles.radioOptionText}>Médio</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        size === 'LARGE' && [styles.radioOptionSelected, { backgroundColor: `${colors.accent}20` }],
                        { borderColor: isDark ? colors.border : 'rgba(0,0,0,0.1)' }
                      ]}
                      onPress={() => setSize('LARGE')}
                    >
                      <Ionicons 
                        name={size === 'LARGE' ? "radio-button-on" : "radio-button-off"} 
                        size={18} 
                        color={colors.accent}
                      />
                      <ThemedText style={styles.radioOptionText}>Grande</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <TextInput
                  label="Peso (kg)"
                  value={weight}
                  onChangeText={text => setWeight(text.replace(/[^0-9.]/g, ''))}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                  keyboardType="numeric"
                />
                  <TextInput
                  label="Descrição"
                  value={description}
                  onChangeText={setDescription}
                  style={[styles.input]}
                  theme={paperTheme}
                  multiline
                  numberOfLines={4}
                  mode="outlined"
                  placeholder="Conte um pouco sobre a personalidade e hábitos do seu pet..."
                />
                
                <View style={[styles.infoContainer, { 
                  borderColor: colors.border,
                  borderWidth: isDark ? 1 : 0,
                  borderRadius: 8,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
                  <ThemedText style={[styles.infoText, { color: colors.textTertiary }]}>
                    Quanto mais detalhes você fornecer sobre o seu pet, mais fácil será para alguém identificá-lo em caso de perda.
                  </ThemedText>
                </View>
              </View>
            )}
          </ThemedCard>
          
          {/* Seção médica */}
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
                  Informações Médicas
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
                <View style={[styles.switchContainer, { borderBottomColor: isDark ? colors.border : 'rgba(0,0,0,0.05)' }]}>
                  <View style={styles.switchTextContainer}>
                    <ThemedText style={styles.switchLabel}>Castrado/Esterilizado</ThemedText>
                    <ThemedText style={[styles.switchDescription, { color: colors.textTertiary }]}>
                      Seu pet passou por procedimento de castração
                    </ThemedText>
                  </View>
                  <Switch
                    value={isNeutered}
                    onValueChange={setIsNeutered}
                    color={colors.accent}
                  />
                </View>
                
                <View style={[styles.switchContainer, { borderBottomColor: isDark ? colors.border : 'rgba(0,0,0,0.05)' }]}>
                  <View style={styles.switchTextContainer}>
                    <ThemedText style={styles.switchLabel}>Necessidades Especiais</ThemedText>
                    <ThemedText style={[styles.switchDescription, { color: colors.textTertiary }]}>
                      Seu pet precisa de cuidados especiais
                    </ThemedText>
                  </View>
                  <Switch
                    value={hasSpecialNeeds}
                    onValueChange={setHasSpecialNeeds}
                    color={colors.accent}
                  />
                </View>
                
                {hasSpecialNeeds && (
                  <TextInput
                    label="Descreva as necessidades especiais"
                    value={specialNeedsDescription}
                    onChangeText={setSpecialNeedsDescription}
                    style={[styles.input]}
                    theme={paperTheme}
                    multiline
                    numberOfLines={3}
                    mode="outlined"
                    error={hasSpecialNeeds && !specialNeedsDescription.trim()}
                  />
                )}
                
                <TextInput
                  label="Número do Microchip"
                  value={microchipNumber}
                  onChangeText={setMicrochipNumber}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                />
                
                <TextInput
                  label="Medicamentos"
                  value={medication}
                  onChangeText={setMedication}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                  placeholder="Medicamentos que o pet toma regularmente"
                />
                
                <TextInput
                  label="Dieta Especial"
                  value={specialDiet}
                  onChangeText={setSpecialDiet}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                  placeholder="Alimentos recomendados ou restrições alimentares"
                />

                <View style={[styles.infoContainer, { 
                  borderColor: colors.accent,
                  borderWidth: isDark ? 1 : 0,
                  borderRadius: 8,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
                  <ThemedText style={[styles.infoText, { color: colors.textTertiary }]}>
                    As informações médicas do seu pet podem ser úteis em situações de emergência.
                  </ThemedText>
                </View>
              </View>
            )}
          </ThemedCard>
          
          {/* Botão de salvar */}          
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.saveButtonText}>
                {isEditing ? 'Atualizar Pet' : 'Cadastrar Pet'}
              </ThemedText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}  const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
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
  imagesSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  imagesContainer: {
    paddingRight: 16,
  },
  imageContainer: {
    width: 140,
    height: 140,
    borderRadius: 16,
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  petImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  imageActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'column',
  },
  imageAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryImageAction: {
    backgroundColor: '#ED5014',
  },
  removeImageAction: {
    backgroundColor: 'rgba(255,0,0,0.6)',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 4,
  },
  primaryBadgeText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addImageButton: {
    width: 140,
    height: 140,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    marginTop: 8,
    fontSize: 14,
  },
  imageHelpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  imageHelpText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
    lineHeight: 18,
  },
  sectionCard: {
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
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
    padding: 15,
    paddingTop: 5,
  },
  input: {
    marginBottom: 15,
    fontSize: 16,
    borderRadius: 8,
  },
  radioGroup: {
    marginBottom: 15,
  },
  radioGroupLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  radioOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  radioOptionSelected: {
    borderColor: '#ED5014',
  },
  radioOptionText: {
    marginLeft: 4,
    fontSize: 14,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  dateInputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
  },
  dateTextPlaceholder: {
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 15,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 14,
  },  
  /* Botão de salvar */
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginVertical: 20,
    marginBottom: 48,
    backgroundColor: '#ED5014',
  },
  gradientButton: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  infoContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
    lineHeight: 18,
  }
});