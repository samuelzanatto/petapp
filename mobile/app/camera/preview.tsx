import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '@/constants/Fonts';

export default function Preview() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const imageBase64 = params.imageBase64 as string;
  const { colors, isDark } = useTheme();

  const handleSave = () => {
    if (!imageBase64) {
      console.error('Nenhuma imagem para salvar');
      return;
    }
    
    console.log('Preview - enviando imagem em base64 para tela de criação');
    router.push({
      pathname: '/post/create',
      params: { imageBase64 }
    });
  };

  if (!imageBase64) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
        <View style={[styles.header]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Preview</ThemedText>
          <View style={{width: 24}} />
        </View>

        <View style={[styles.errorContainer, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
          <Ionicons name="image-outline" size={60} color={colors.textTertiary} />
          <ThemedText style={[styles.errorText, { color: colors.textSecondary }]}>
            Nenhuma imagem para visualizar
          </ThemedText>
          <TouchableOpacity 
            style={styles.backButtonAlt} 
            onPress={() => router.back()}
          >
            <LinearGradient
              colors={[colors.accent, '#FF8A43']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <ThemedText style={styles.buttonText}>Voltar</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
      <View style={[styles.header]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Preview</ThemedText>
        <View style={{width: 24}} />
      </View>
      
      <View style={[styles.imageContainer, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
        <Image 
          source={{ uri: `data:image/jpeg;base64,${imageBase64}` }} 
          style={styles.image} 
          resizeMode="contain" 
          onError={(e) => console.error('Erro na visualização da imagem:', e.nativeEvent.error)}
        />
      </View>
      
      <View style={[styles.buttonsContainer, { 
        backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 0.8)',
        shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 5
      }]}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleSave}
        >
          <LinearGradient
            colors={[colors.accent, '#FF8A43']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="checkmark" size={22} color="#fff" style={styles.buttonIcon} />
            <ThemedText style={styles.buttonText}>Usar Foto</ThemedText>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.cancelButtonAlt, { 
            backgroundColor: isDark ? 'rgba(45, 45, 45, 0.9)' : 'rgba(240, 240, 240, 0.9)',
            borderColor: colors.border,
            borderWidth: 1
          }]} 
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={22} color={colors.textSecondary} style={styles.buttonIcon} />
          <ThemedText style={[styles.cancelText, {color: colors.textSecondary}]}>Cancelar</ThemedText>
        </TouchableOpacity>
      </View>
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
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 10 : 15,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  buttonsContainer: {
    padding: 15,
    paddingBottom: 25,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
  },
  actionButton: {
    height: 50,
    borderRadius: 16,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  gradientButton: {
    height: '100%',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonAlt: {
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: FontFamily.medium,
  },
  buttonIcon: {
    marginRight: 8,
  },
  backButtonAlt: {
    height: 45,
    borderRadius: 16,
    overflow: 'hidden',
    width: 180,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontFamily: FontFamily.medium,
  }
});