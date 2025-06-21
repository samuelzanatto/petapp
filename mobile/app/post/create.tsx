import React, { useState, useEffect } from 'react';
import { 
  View, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, TextInput, 
  ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/ThemedText';
import { usePets } from '@/hooks/usePets';
import { api } from '@/services/api';
import { Loading } from '@/components/Loading';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '@/constants/Fonts';

export default function CreatePost() {
  const params = useLocalSearchParams();
  
  // Novas props do sistema melhorado
  const imageId = params.imageId as string | undefined;
  const imagePath = params.imagePath as string | undefined;
  const imageUrl = params.imageUrl as string | undefined;
  
  // Estados
  const [caption, setCaption] = useState('');
  const [selectedPetId, setSelectedPetId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const { colors, isDark } = useTheme();
  const { pets, loading: loadingPets } = usePets();

  // Verificar se temos a imagem 
  useEffect(() => {
    if (!imageUrl && !imagePath) {
      // Se não temos imagem, voltar para a tela anterior
      Alert.alert(
        'Imagem necessária', 
        'Você precisa selecionar uma imagem para criar um post.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [imageUrl, imagePath]);

  const handleSubmit = async () => {
    if (!imagePath) {
      Alert.alert('Erro', 'Por favor, selecione uma imagem para o post.');
      return;
    }
  
    setLoading(true);
  
    try {
      console.log("Criando post com imagem:", imagePath);
      
      // Criar post diretamente com o caminho da imagem
      const result = await api.post('/posts', {
        caption,
        petId: selectedPetId || null,
        imagePath
      });
      
      console.log("Post criado:", result);
      
      Alert.alert('Sucesso', 'Post criado com sucesso!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      console.error('Erro ao criar post:', error);
      Alert.alert('Erro', 'Não foi possível criar o post. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={[styles.cancelButton, { color: colors.textSecondary }]}>
            Cancelar
          </ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Nova Publicação</ThemedText>
        <TouchableOpacity 
          disabled={loading}
          onPress={handleSubmit}
        >
          <ThemedText style={[
            styles.shareButton, 
            loading && { color: colors.textTertiary }
          ]}>
            {loading ? 'Enviando...' : 'Compartilhar'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ backgroundColor: isDark ? '#121212' : '#F8F8F8' }}>
        {imageUrl ? (
          <View style={[styles.imagePreviewContainer, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
            <Image 
              source={{ uri: imageUrl }}
              style={styles.imagePreview} 
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={[styles.imagePreviewContainer, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
            <Loading message="Carregando imagem..." />
          </View>
        )}

        <View style={[styles.formSection, { 
          backgroundColor: isDark ? '#121212' : '#F8F8F8' 
        }]}>
          <ThemedText style={styles.sectionTitle}>Legenda</ThemedText>
          <TextInput
            style={[styles.captionInput, { 
              borderColor: colors.border,
              backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 0.8)',
              color: colors.text
            }]}
            placeholder="Escreva uma legenda..."
            placeholderTextColor={colors.textTertiary}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={2200}
          />
          <ThemedText style={[styles.characterCount, { color: colors.textTertiary }]}>
            {caption.length}/2200
          </ThemedText>
        </View>

        <View style={[styles.formSection, { 
          backgroundColor: isDark ? '#121212' : '#F8F8F8'
        }]}>
          <ThemedText style={styles.sectionTitle}>Selecione um pet (opcional)</ThemedText>
          
          {loadingPets ? (
            <Loading size="small" message="Carregando pets..." />
          ) : pets.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.petsContainer}
            >
              {pets.map(pet => (
                <TouchableOpacity
                  key={pet.id}
                  style={[
                    styles.petItem,
                    selectedPetId === pet.id && [styles.selectedPet, {borderColor: colors.accent}],
                    { 
                      backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 1)',
                      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isDark ? 0.25 : 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }
                  ]}
                  onPress={() => setSelectedPetId(
                    selectedPetId === pet.id ? undefined : pet.id
                  )}
                >
                  <Image
                    source={
                      pet.primaryImage
                        ? { uri: pet.primaryImage }
                        : require('@/assets/images/default-pet.png')
                    }
                    style={styles.petImage}
                  />
                  <ThemedText style={styles.petName}>{pet.name}</ThemedText>
                  
                  {selectedPetId === pet.id && (
                    <View style={[styles.selectedPetIndicator, {backgroundColor: colors.accent}]}>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noPetsContainer}>
              <ThemedText style={[styles.noPetsText, { color: colors.textSecondary }]}>
                Você ainda não tem pets cadastrados.
              </ThemedText>
              <TouchableOpacity
                style={styles.addPetButton}
                onPress={() => router.push('/pet/create')}
              >
                <LinearGradient
                  colors={[colors.accent, '#FF8A43']}
                  style={styles.gradientButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="add-circle-outline" size={20} color="white" style={{marginRight: 8}} />
                    <ThemedText style={styles.addPetButtonText}>Cadastrar Pet</ThemedText>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.submitButton, {
            opacity: loading ? 0.7 : 1
          }]}
          disabled={loading}
          onPress={handleSubmit}
        >
          <LinearGradient
            colors={[colors.accent, '#FF8A43']}
            style={styles.gradientSubmitButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <Loading size="small" color="#FFF" />
            ) : (
              <ThemedText style={styles.submitButtonText}>Compartilhar</ThemedText>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 10 : 15,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
  },
  cancelButton: {
    fontSize: 16,
    fontFamily: FontFamily.medium,
  },
  shareButton: {
    fontSize: 16,
    color: '#FF8A43',
    fontFamily: FontFamily.bold,
  },
  disabledButton: {
    color: '#CCC',
  },
  imagePickerContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-around',
  },
  imagePickerButton: {
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderRadius: 16,
    width: '45%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  imagePickerText: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: FontFamily.regular,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    padding: 20,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    marginBottom: 15,
  },
  changeImageButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  changeImageText: {
    color: 'white',
    fontFamily: FontFamily.bold,
  },
  formSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    marginBottom: 12,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    fontFamily: FontFamily.regular,
  },
  characterCount: {
    alignSelf: 'flex-end',
    marginTop: 8,
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  petsContainer: {
    paddingVertical: 15,
  },
  petItem: {
    marginRight: 15,
    alignItems: 'center',
    position: 'relative',
    padding: 12,
    borderRadius: 16,
  },
  selectedPet: {
    borderWidth: 2,
  },
  petImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 10,
  },
  petName: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
  },
  selectedPetIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    borderRadius: 10,
    padding: 2,
  },
  noPetsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noPetsText: {
    marginBottom: 15,
    fontSize: 16,
    fontFamily: FontFamily.regular,
  },
  addPetButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    width: 180,
    height: 45,
  },
  gradientButton: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPetButtonText: {
    color: 'white',
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  submitButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    marginTop: 10,
    height: 50,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  gradientSubmitButton: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
});