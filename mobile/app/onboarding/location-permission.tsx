import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/theme';
import { useAuth } from '@/contexts/auth';
import { useLocation } from '@/contexts/location';
import * as Location from 'expo-location';
import { ActivityIndicator } from 'react-native';

export default function LocationPermission() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, loading } = useAuth();
  const { 
    requestLocationPermission, 
  } = useLocation();
  const [requesting, setRequesting] = useState(false);
  
  // Verificar status da permissão ao montar o componente
  useEffect(() => {
    const checkPermission = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        console.log('Permissão de localização já concedida');
      }
    };
    
    checkPermission();
  }, []);
  
  // Verificação de autenticação diretamente nesta página
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }
  
  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }
  
  const handleRequestPermission = async () => {
    try {
      setRequesting(true);
      
      // Solicitar permissão
      const result = await requestLocationPermission();
      
      if (result) {
        // Seguir para próxima etapa
        router.push('/onboarding/notification-permission');
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
    } finally {
      setRequesting(false);
    }
  };
  
  const handleSkip = () => {
    router.push('/onboarding/notification-permission');
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image 
            source={require('@/assets/images/location-permission.jpg')}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Localização</Text>
          <Text style={[styles.description, { color: colors.textTertiary }]}>
            O acesso à sua localização ajudará a encontrar pets perdidos na sua região 
            e permitirá que outros usuários vejam a localização aproximada caso seu pet se perca.
          </Text>
        </View>
        
        <View style={styles.benefitsContainer}>
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: isDark ? 'rgba(237, 80, 20, 0.2)' : 'rgba(237, 80, 20, 0.1)' }]}>
              <Ionicons name="search" size={22} color="#ED5014" />
            </View>
            <View style={styles.benefitText}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>
                Encontre pets perdidos por perto
              </Text>
              <Text style={[styles.benefitDescription, { color: colors.textTertiary }]}>
                Veja alertas de pets perdidos na sua região
              </Text>
            </View>
          </View>
          
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: isDark ? 'rgba(237, 80, 20, 0.2)' : 'rgba(237, 80, 20, 0.1)' }]}>
              <Ionicons name="compass" size={22} color="#ED5014" />
            </View>
            <View style={styles.benefitText}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>
                Ajude a encontrar seu pet
              </Text>
              <Text style={[styles.benefitDescription, { color: colors.textTertiary }]}>
                Compartilhe a localização aproximada onde seu pet foi visto pela última vez
              </Text>
            </View>
          </View>
          
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: isDark ? 'rgba(237, 80, 20, 0.2)' : 'rgba(237, 80, 20, 0.1)' }]}>
              <Ionicons name="people" size={22} color="#ED5014" />
            </View>
            <View style={styles.benefitText}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>
                Conecte-se com a comunidade
              </Text>
              <Text style={[styles.benefitDescription, { color: colors.textTertiary }]}>
                Encontre outros tutores de pets na sua região
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.privacyContainer}>
          <Ionicons name="shield-checkmark-outline" size={20} color={isDark ? '#AAA' : '#777'} />
          <Text style={[styles.privacyText, { color: isDark ? '#AAA' : '#777' }]}>
            Sua localização exata nunca será compartilhada publicamente, apenas um raio aproximado.
          </Text>
        </View>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={handleSkip}
            disabled={requesting}
          >
            <Text style={[styles.skipText, { color: isDark ? '#AAA' : '#777' }]}>
              Pular por enquanto
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={handleRequestPermission}
            disabled={requesting}
          >
            <LinearGradient
              colors={['#ED5014', '#ED5014']}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {requesting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Text style={styles.permissionButtonText}>
                    Permitir Localização
                  </Text>
                  <Ionicons name="location" size={20} color="#FFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  textContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  benefitsContainer: {
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  privacyContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  privacyText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  buttonsContainer: {
    marginTop: 'auto',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  skipText: {
    fontSize: 16,
  },
  permissionButton: {
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
});