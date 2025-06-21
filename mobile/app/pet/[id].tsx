import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  FlatList,
  Alert,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme';
import { useAuth } from '@/contexts/auth';
import { api } from '@/services/api';
import { Colors } from '@/constants/Colors';
import { getImageUrl } from '@/utils/imageUtils';
import { formatDate, calculateAge } from '@/utils/formatters';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { LinearGradient } from 'expo-linear-gradient';
import ImageView from 'react-native-image-viewing';

const { width } = Dimensions.get('window');

type Pet = {
  id: string;
  name: string;
  nickname: string | null;
  species: 'DOG' | 'CAT';
  breed: string | null;
  birthDate: string | null;
  gender: 'MALE' | 'FEMALE' | null;
  color: string | null;
  secondaryColor: string | null;
  coatType: string | null;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | null;
  weight: number | null;
  distinguishingMarks: string | null;
  description: string | null;
  isNeutered: boolean;
  hasSpecialNeeds: boolean;
  specialNeedsDescription: string | null;
  microchipNumber: string | null;
  medication: string | null;
  specialDiet: string | null;
  veterinarianContact: string | null;
  temperament: string | null;
  isTrainedToCommands: boolean;
  reactsTo: string | null;
  primaryImage: string | null;
  images: string[];
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    profileImage: string | null;
  };
};

export default function PetDetails() {
  const { colors, isDark } = useTheme();
  const themeColors = isDark ? Colors.dark : Colors.light;
  const params = useLocalSearchParams();
  const petId = params.id as string;
  const { user } = useAuth();
  
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageViewVisible, setImageViewVisible] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    details: true,
    medical: false,
    behavior: false,
  });
  
  // Referência para a ScrollView, para scrollar para seções específicas
  const scrollViewRef = useRef<ScrollView>(null);

  // Carregar os detalhes do pet
  useEffect(() => {
    fetchPetDetails();
  }, [petId]);

  const fetchPetDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await api.get(`/pets/${petId}`);
      
      if (!data) {
        throw new Error('Não foi possível obter os detalhes do pet');
      }
      
      // Garantir que todas as propriedades críticas existam
      const formattedPet = {
        ...data,
        // Mapeamento correto de campos do backend para o frontend
        gender: data.gender || null,
        color: data.primaryColor || null,
        coatType: data.furType || null,
        secondaryColor: data.secondaryColor || null,
        distinguishingMarks: data.distinguishingMarks || null,
        veterinarianContact: data.veterinarianContact || null,
        temperament: data.temperament || null,
        isTrainedToCommands: data.isTrainedToCommands || false,
        reactsTo: data.reactsTo || null,
        // Formatar URLs de imagens
        primaryImage: data.primaryImage ? getImageUrl(data.primaryImage) : null,
        images: Array.isArray(data.images) ? data.images.map((img: string) => getImageUrl(img)) : []
      };
      
      setPet(formattedPet);
    } catch (error) {
      console.error('Erro ao obter detalhes do pet:', error);
      setError('Não foi possível carregar os detalhes deste pet. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!pet) return;
    
    try {
      const message = `Conheça ${pet.name}, um ${pet.species === 'DOG' ? 'cachorro' : 'gato'} ${pet.breed ? `da raça ${pet.breed}` : ''} do PetApp!`;
      
      await Share.share({
        message,
        url: pet.primaryImage || undefined,
        title: `Pet: ${pet.name}`
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };
  
  // Função para obter um texto baseado no gênero
  const getGenderText = (gender: 'MALE' | 'FEMALE' | null) => {
    if (!gender) return 'Não informado';
    return gender === 'MALE' ? 'Macho' : 'Fêmea';
  };
  
  // Função para obter um texto baseado no tamanho
  const getSizeText = (size: 'SMALL' | 'MEDIUM' | 'LARGE' | null) => {
    if (!size) return 'Não informado';
    
    switch (size) {
      case 'SMALL': return 'Pequeno';
      case 'MEDIUM': return 'Médio';
      case 'LARGE': return 'Grande';
      default: return 'Não informado';
    }
  };
  
  // Função para ajustar o estado de expansão das seções
  const toggleSection = (section: 'details' | 'medical' | 'behavior') => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };
  
  // Função para visualizar a imagem em tela cheia
  const handleImagePress = (index: number) => {
    setActiveImageIndex(index);
    setImageViewVisible(true);
  };
  
  const allImages = pet?.primaryImage 
    ? [pet.primaryImage, ...(pet.images || [])]
    : pet?.images || [];
    
  // Verificar se é o dono do pet
  const isOwner = user?.id === pet?.ownerId;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 0,
    },
    headerTitle: {
      marginTop: 4,
      fontSize: 18,
      fontWeight: 'bold',
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    shareButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollView: {
      flex: 1,
    },
    imageGallery: {
      marginBottom: 16,
    },
    mainImage: {
      width: '100%',
      height: width * 0.8,
      borderRadius: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    thumbnailsContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    thumbnailContainer: {
      marginRight: 10,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
    },
    thumbnail: {
      width: 80,
      height: 80,
    },
    basicInfoContainer: {
      padding: 16,
    },
    nameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    petName: {
      fontSize: 28,
      fontWeight: 'bold',
      marginRight: 8,
    },
    nickname: {
      fontSize: 18,
      color: '#666',
      fontStyle: 'italic',
    },
    speciesBreedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: 8,
    },
    speciesText: {
      fontSize: 16,
      marginRight: 8,
    },
    breedText: {
      fontSize: 16,
      marginRight: 8,
    },
    genderText: {
      fontSize: 16,
    },
    birthDateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    birthDateText: {
      fontSize: 14,
      marginLeft: 8,
    },
    ageText: {
      fontWeight: '600',
    },
    sectionCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: isDark ? 'rgba(42, 36, 31, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    sectionContent: {
      padding: 16,
      paddingTop: 0,
    },
    detailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    detailItem: {
      flex: 1,
      alignItems: 'flex-start',
      paddingRight: 8,
    },
    detailLabel: {
      fontSize: 12,
      marginTop: 4,
      marginBottom: 2,
      color: '#666',
    },
    detailValue: {
      fontSize: 15,
      fontWeight: '500',
    },
    fullWidthItem: {
      marginBottom: 16,
    },
    fullWidthItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    fullWidthItemLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
    fullWidthItemValue: {
      fontSize: 14,
      paddingLeft: 26,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    infoRowText: {
      fontSize: 14,
      marginLeft: 8,
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      flex: 1,
      marginHorizontal: 4,
    },
    actionButtonText: {
      color: '#FFF',
      fontWeight: '500',
      marginLeft: 6,
      fontSize: 14,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 12,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 24,
    },
    retryButton: {
      backgroundColor: '#FF6B6B',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
    },
    retryButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },
  });

  // Componente para exibir o estado de carregamento
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.accent} />
          <ThemedText style={styles.loadingText}>Carregando informações do pet...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // Componente para exibir mensagem de erro
  if (error || !pet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={70} color={themeColors.error} />
          <ThemedText style={styles.errorTitle}>Oops!</ThemedText>
          <ThemedText style={styles.errorText}>{error || 'Ocorreu um erro ao carregar os detalhes do pet.'}</ThemedText>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: themeColors.accent }]} 
            onPress={fetchPetDetails}
          >
            <ThemedText style={styles.retryButtonText}>Tentar Novamente</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <View style={[styles.header, { 
        backgroundColor: isDark ? themeColors.card : 'rgba(255,255,255,0.95)',
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        
        <ThemedText type="subtitle" style={[styles.headerTitle, {color: themeColors.text}]}>
          Detalhes do Pet
        </ThemedText>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-outline" size={22} color={themeColors.text} />
          </TouchableOpacity>
          
          {isOwner && (
            <TouchableOpacity 
              onPress={() => router.push(`/pet/edit/${pet.id}`)} 
              style={styles.editButton}
            >
              <Ionicons name="pencil" size={20} color={themeColors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
        
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
          {/* Galeria de Imagens */}
          <View style={styles.imageGallery}>
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => handleImagePress(0)}
            >
              <Image 
                source={pet.primaryImage ? { uri: pet.primaryImage } : require('@/assets/images/default-pet.png')} 
                style={[styles.mainImage, {
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  borderTopLeftRadius: 0, 
                  borderTopRightRadius: 0,
                }]}
                resizeMode="cover"
              />
            </TouchableOpacity>
            
            {allImages.length > 1 && (
              <FlatList
                data={allImages.slice(1)}
                keyExtractor={(item, index) => `image-${index + 1}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailsContainer}
                renderItem={({ item, index }) => (
                  <TouchableOpacity 
                    style={[styles.thumbnailContainer, {
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isDark ? 0.3 : 0.15,
                      shadowRadius: 4,
                      elevation: 3,
                    }]}
                    onPress={() => handleImagePress(index + 1)}
                  >
                    <Image 
                      source={{ uri: item }} 
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
          
          {/* Informações Básicas */}
          <ThemedCard style={{
            marginHorizontal: 16,
            marginBottom: 16,
            padding: 20,
            borderRadius: 16,
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4
          }}>
            <View style={styles.nameContainer}>
              <ThemedText type="title" style={[styles.petName, {color: themeColors.text}]}>
                {pet.name}
              </ThemedText>
              
              {pet.nickname && (
                <ThemedText style={[styles.nickname, {color: themeColors.textTertiary}]}>
                  ({pet.nickname})
                </ThemedText>
              )}
            </View>
            
            <View style={styles.speciesBreedContainer}>
              <ThemedText style={[styles.speciesText, {color: themeColors.textSecondary}]}>
                {pet.species === 'DOG' ? '🐶 Cachorro' : '🐱 Gato'}
              </ThemedText>

              <ThemedText style={[styles.breedText, {color: themeColors.textSecondary}]}>
                • {pet.breed || 'Raça não informada'}
              </ThemedText>

              <ThemedText style={[styles.genderText, {color: themeColors.textSecondary}]}>
                • {getGenderText(pet.gender)}
              </ThemedText>
            </View>
            
            {pet.birthDate && (
              <View style={styles.birthDateContainer}>
                <Ionicons name="calendar-outline" size={16} color={themeColors.textTertiary} />
                <ThemedText style={[styles.birthDateText, { color: themeColors.textTertiary }]}>
                  {formatDate(pet.birthDate)}{' '}
                  <ThemedText style={[styles.ageText, { color: themeColors.textSecondary }]}>
                    ({calculateAge(pet.birthDate)} anos)
                  </ThemedText>
                </ThemedText>
              </View>
            )}
          </ThemedCard>
          
          {/* Detalhes Físicos */}        
          <ThemedCard style={[styles.sectionCard, {
          borderRadius: 16,
          shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.1,
          shadowRadius: 6,
          elevation: 4,
          backgroundColor: isDark ? 'rgba(42, 36, 31, 0.95)' : 'rgba(255, 255, 255, 0.95)'
        }]}>
          <TouchableOpacity 
            style={[styles.sectionHeader, {backgroundColor: themeColors.card}]} 
            onPress={() => toggleSection('details')}
          >
            <ThemedText style={[styles.sectionTitle, {color: themeColors.text}]}>Características</ThemedText>
            <Ionicons 
              name={expandedSections.details ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={themeColors.textSecondary} 
            />
          </TouchableOpacity>
            
            {expandedSections.details && (
              <View style={[styles.sectionContent, {backgroundColor: themeColors.card}]}>
                {/* Linha 1: Tamanho e Peso */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="resize" size={18} color={themeColors.accent} />
                    <ThemedText style={[styles.detailLabel, {color: themeColors.textTertiary}]}>Tamanho</ThemedText>
                    <ThemedText style={[styles.detailValue, {color: themeColors.text}]}>
                      {getSizeText(pet.size)}
                    </ThemedText>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <Ionicons name="scale" size={18} color={themeColors.accent} />
                    <ThemedText style={[styles.detailLabel, {color: themeColors.textTertiary}]}>Peso</ThemedText>
                    <ThemedText style={[styles.detailValue, {color: themeColors.text}]}>
                      {pet.weight ? `${pet.weight} kg` : 'Não informado'}
                    </ThemedText>
                  </View>
                </View>
                
                {/* Linha 2: Cores */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="color-palette" size={18} color={themeColors.accent} />
                    <ThemedText style={[styles.detailLabel, {color: themeColors.textTertiary}]}>Cor principal</ThemedText>
                    <ThemedText style={[styles.detailValue, {color: themeColors.text}]}>
                      {pet.color || 'Não informada'}
                    </ThemedText>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <Ionicons name="color-fill" size={18} color={themeColors.accent} />
                    <ThemedText style={[styles.detailLabel, {color: themeColors.textTertiary}]}>Cor secundária</ThemedText>
                    <ThemedText style={[styles.detailValue, {color: themeColors.text}]}>
                      {pet.secondaryColor || 'Não informada'}
                    </ThemedText>
                  </View>
                </View>
                
                {/* Linha 3: Tipo de Pelagem */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="leaf" size={18} color={themeColors.accent} />
                    <ThemedText style={[styles.detailLabel, {color: themeColors.textTertiary}]}>Tipo de Pelagem</ThemedText>
                    <ThemedText style={[styles.detailValue, {color: themeColors.text}]}>
                      {pet.coatType || 'Não informado'}
                    </ThemedText>
                  </View>
                </View>
                
                {/* Marcas distintivas */}
                {pet.distinguishingMarks && (
                  <View style={styles.fullWidthItem}>
                    <View style={styles.fullWidthItemHeader}>
                      <Ionicons name="paw" size={18} color={themeColors.accent} />
                      <ThemedText style={[styles.fullWidthItemLabel, {color: themeColors.textSecondary}]}>
                        Marcas Distintivas
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.fullWidthItemValue, {color: themeColors.text}]}>
                      {pet.distinguishingMarks}
                    </ThemedText>
                  </View>
                )}
                
                {/* Descrição geral */}
                {pet.description && (
                  <View style={styles.fullWidthItem}>
                    <View style={styles.fullWidthItemHeader}>
                      <Ionicons name="document-text" size={18} color={themeColors.accent} />
                      <ThemedText style={[styles.fullWidthItemLabel, {color: themeColors.textSecondary}]}>
                        Descrição
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.fullWidthItemValue, {color: themeColors.text}]}>
                      {pet.description}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}
          </ThemedCard>
          
          {/* Comportamento */}
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
          >
            <ThemedText style={[styles.sectionTitle, {color: themeColors.text}]}>Comportamento</ThemedText>
            <Ionicons 
              name={expandedSections.behavior ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={themeColors.textSecondary} 
            />
          </TouchableOpacity>
            
            {expandedSections.behavior && (
              <View style={[styles.sectionContent, {backgroundColor: themeColors.card}]}>
                {/* Temperamento */}
                {pet.temperament && (
                  <View style={styles.fullWidthItem}>
                    <View style={styles.fullWidthItemHeader}>
                      <Ionicons name="happy" size={18} color={themeColors.accent} />
                      <ThemedText style={[styles.fullWidthItemLabel, {color: themeColors.textSecondary}]}>
                        Temperamento
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.fullWidthItemValue, {color: themeColors.text}]}>
                      {pet.temperament}
                    </ThemedText>
                  </View>
                )}
                
                {/* Responde a comandos */}
                <View style={styles.infoRow}>
                  <Ionicons 
                    name={pet.isTrainedToCommands ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={pet.isTrainedToCommands ? themeColors.success : themeColors.error} 
                  />
                  <ThemedText style={[styles.infoRowText, {color: themeColors.text}]}>
                    {pet.isTrainedToCommands 
                      ? "Responde a comandos básicos" 
                      : "Não responde a comandos básicos"}
                  </ThemedText>
                </View>
                
                {/* Reage a */}
                {pet.reactsTo && (
                  <View style={styles.fullWidthItem}>
                    <View style={styles.fullWidthItemHeader}>
                      <Ionicons name="ear" size={18} color={themeColors.accent} />
                      <ThemedText style={[styles.fullWidthItemLabel, {color: themeColors.textSecondary}]}>
                        Reage a
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.fullWidthItemValue, {color: themeColors.text}]}>
                      {pet.reactsTo}
                    </ThemedText>
                  </View>
                )}
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
            >
              <ThemedText style={[styles.sectionTitle, {color: themeColors.text}]}>Informações Médicas</ThemedText>
              <Ionicons 
                name={expandedSections.medical ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={themeColors.textSecondary} 
              />
            </TouchableOpacity>
            
            {expandedSections.medical && (
              <View style={[styles.sectionContent, {backgroundColor: themeColors.card}]}>
                {/* Status vacinação e castração */}
                <View style={styles.infoRow}>
                  <Ionicons 
                    name={pet.isNeutered ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={pet.isNeutered ? themeColors.success : themeColors.error} 
                  />
                  <ThemedText style={[styles.infoRowText, {color: themeColors.text}]}>
                    {pet.isNeutered 
                      ? "Castrado / Esterilizado" 
                      : "Não castrado / Não esterilizado"}
                  </ThemedText>
                </View>
                
                <View style={styles.infoRow}>
                  <Ionicons 
                    name={pet.hasSpecialNeeds ? "medkit" : "medkit-outline"} 
                    size={20} 
                    color={pet.hasSpecialNeeds ? themeColors.warning : themeColors.textTertiary} 
                  />
                  <ThemedText style={[styles.infoRowText, {color: themeColors.text}]}>
                    {pet.hasSpecialNeeds 
                      ? "Possui necessidades especiais" 
                      : "Não possui necessidades especiais"}
                  </ThemedText>
                </View>
                
                {/* Descrição das necessidades especiais */}
                {pet.hasSpecialNeeds && pet.specialNeedsDescription && (
                  <View style={styles.fullWidthItem}>
                    <View style={styles.fullWidthItemHeader}>
                      <Ionicons name="heart" size={18} color={themeColors.accent} />
                      <ThemedText style={[styles.fullWidthItemLabel, {color: themeColors.textSecondary}]}>
                        Detalhes das necessidades especiais
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.fullWidthItemValue, {color: themeColors.text}]}>
                      {pet.specialNeedsDescription}
                    </ThemedText>
                  </View>
                )}
                
                {/* Medicação e Dieta */}
                {pet.medication && (
                  <View style={styles.fullWidthItem}>
                    <View style={styles.fullWidthItemHeader}>
                      <Ionicons name="medical" size={18} color={themeColors.accent} />
                      <ThemedText style={[styles.fullWidthItemLabel, {color: themeColors.textSecondary}]}>
                        Medicação
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.fullWidthItemValue, {color: themeColors.text}]}>
                      {pet.medication}
                    </ThemedText>
                  </View>
                )}
                
                {pet.specialDiet && (
                  <View style={styles.fullWidthItem}>
                    <View style={styles.fullWidthItemHeader}>
                      <Ionicons name="restaurant" size={18} color={themeColors.accent} />
                      <ThemedText style={[styles.fullWidthItemLabel, {color: themeColors.textSecondary}]}>
                        Dieta Especial
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.fullWidthItemValue, {color: themeColors.text}]}>
                      {pet.specialDiet}
                    </ThemedText>
                  </View>
                )}
                
                {/* Microchip */}
                {pet.microchipNumber && (
                  <View style={styles.fullWidthItem}>
                    <View style={styles.fullWidthItemHeader}>
                      <Ionicons name="barcode" size={18} color={themeColors.accent} />
                      <ThemedText style={[styles.fullWidthItemLabel, {color: themeColors.textSecondary}]}>
                        Número do Microchip
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.fullWidthItemValue, {color: themeColors.text}]}>
                      {pet.microchipNumber}
                    </ThemedText>
                  </View>
                )}
                
                {/* Veterinário */}
                {pet.veterinarianContact && (
                  <View style={styles.fullWidthItem}>
                    <View style={styles.fullWidthItemHeader}>
                      <Ionicons name="person" size={18} color={themeColors.accent} />
                      <ThemedText style={[styles.fullWidthItemLabel, {color: themeColors.textSecondary}]}>
                        Contato Veterinário
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.fullWidthItemValue, {color: themeColors.text}]}>
                      {pet.veterinarianContact}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}
          </ThemedCard>
          
          {/* Botões de Ação */}
          {isOwner && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, { 
                  backgroundColor: themeColors.accent,
                  shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.25 : 0.1,
                  shadowRadius: 3,
                  elevation: 3,
                }]}
                onPress={() => router.push(`/pet/edit/${pet.id}`)}
              >
                <Ionicons name="pencil" size={18} color="#FFF" />
                <Text style={styles.actionButtonText}>Editar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { 
                  backgroundColor: themeColors.success,
                  shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.25 : 0.1,
                  shadowRadius: 3,
                  elevation: 3,
                }]}
                onPress={() => router.push(`/pet/qrcode/${pet.id}`)}
              >
                <Ionicons name="qr-code" size={18} color="#FFF" />
                <Text style={styles.actionButtonText}>Gerar QR Code</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { 
                  backgroundColor: themeColors.error,
                  shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.25 : 0.1,
                  shadowRadius: 3,
                  elevation: 3,
                }]}
                onPress={() => router.push(`/pet/report-lost/${pet.id}`)}
              >
                <Ionicons name="alert-circle" size={18} color="#FFF" />
                <Text style={styles.actionButtonText}>Reportar Perdido</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
        
        {/* Visualizador de imagens em tela cheia */}
        <ImageView
          images={allImages.map(img => ({ uri: img }))}
          imageIndex={activeImageIndex}
          visible={imageViewVisible}
          onRequestClose={() => setImageViewVisible(false)}
          animationType="fade"
          swipeToCloseEnabled
          doubleTapToZoomEnabled
        />
      </SafeAreaView>
  );
}

