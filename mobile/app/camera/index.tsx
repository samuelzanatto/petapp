import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/ThemedText';
import { Loading } from '@/components/Loading';
import { uploadImageFromUri } from '@/utils/imageUpload';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '@/constants/Fonts';

export default function CameraScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const { colors, isDark } = useTheme();
  
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleImageSelection = async (uri: string, source: 'camera' | 'gallery') => {
    try {
      setLoading(true);
      console.log(`Imagem ${source === 'camera' ? 'tirada' : 'selecionada'}: ${uri}`);
      
      // Fazer upload da imagem
      const uploadResult = await uploadImageFromUri(uri, 'posts');
      console.log('Upload concluído:', uploadResult);
      
      // Navegar para a tela de criação de post com dados da imagem
      router.push({
        pathname: '/post/create',
        params: { 
          imageId: uploadResult.id,
          imagePath: uploadResult.path,
          imageUrl: uploadResult.url
        }
      });
    } catch (error) {
      console.error(`Erro ao processar imagem ${source}:`, error);
      
      // Verificar se é um erro de rede
      if (error instanceof Error && 
          (error.message.includes('Network request failed') || 
           error.message.includes('conectar ao servidor'))) {
        Alert.alert(
          'Erro de conexão', 
          'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Tentar processar como erro de moderação de conteúdo
      try {
        const { handleApiError } = await import('@/utils/contentModeration');
        const isContentModerationError = await handleApiError(error);
        
        // Se não for erro de moderação, mostrar mensagem genérica
        if (!isContentModerationError) {
          Alert.alert('Erro', 'Não foi possível processar a imagem. Tente novamente.');
        }
      } catch (e) {
        // Fallback para erro genérico
        Alert.alert('Erro', 'Não foi possível processar a imagem. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const takePicture = async () => {
    try {
      if (!hasPermission) {
        Alert.alert(
          "Permissão necessária", 
          "Precisamos de acesso à sua câmera para tirar fotos.",
          [{ text: "OK" }]
        );
        return;
      }
  
      // Usar o ImagePicker para a câmera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        await handleImageSelection(imageUri, 'camera');
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert("Erro", "Não foi possível tirar a foto. Tente novamente.");
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        await handleImageSelection(imageUri, 'gallery');
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert("Erro", "Não foi possível selecionar a imagem. Tente novamente.");
    }
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={[styles.permissionContainer, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
        <ThemedText style={styles.permissionText}>
          Precisamos de permissão para acessar sua câmera
        </ThemedText>
        <TouchableOpacity 
          style={styles.button} 
          onPress={async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
          }}
        >
          <LinearGradient
            colors={[colors.accent, '#FF8A43']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <ThemedText style={styles.buttonText}>Permitir acesso</ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
      <View style={[styles.header]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Câmera</ThemedText>
        <View style={{width: 50}} />
      </View>
      
      {loading ? (
        <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
          <Loading 
            message="Processando imagem..." 
            size="large"
          />
        </View>
      ) : (
        <View style={[styles.optionsContainer, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
          <ThemedText style={styles.instructionText}>
            Escolha uma opção para adicionar fotos
          </ThemedText>
          
          <TouchableOpacity 
            style={styles.optionButton} 
            onPress={takePicture}
          >
            <LinearGradient
              colors={[colors.accent, '#FF8A43']}
              style={styles.optionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="camera" size={22} color="#fff" style={styles.buttonIcon} />
                <ThemedText style={styles.optionButtonText}>Tirar Foto</ThemedText>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionButton} 
            onPress={pickImage}
          >
            <LinearGradient
              colors={[colors.accent, '#FF8A43']}
              style={styles.optionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="images" size={22} color="#fff" style={styles.buttonIcon} />
                <ThemedText style={styles.optionButtonText}>Escolher da Galeria</ThemedText>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.cancelButton, { 
              backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 0.8)',
              borderColor: colors.border,
              borderWidth: 1
            }]} 
            onPress={() => router.back()}
          >
            <ThemedText style={{ color: colors.textSecondary, fontFamily: FontFamily.medium }}>Cancelar</ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
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
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 10 : 15,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: FontFamily.medium,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  gradientButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: FontFamily.regular,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  instructionText: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
    fontFamily: FontFamily.medium,
  },
  optionButton: {
    width: '80%',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  optionGradient: {
    padding: 18,
    alignItems: 'center',
  },
  optionButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: FontFamily.bold,
  },
  cancelButton: {
    padding: 15,
    borderRadius: 16,
    marginTop: 10,
    width: '80%',
    alignItems: 'center',
  },
});