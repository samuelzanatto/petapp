import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/theme';
import { useAuth } from '@/contexts/auth';
import { ActivityIndicator } from 'react-native';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationPermission() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { requestNotificationPermission } = useNotifications();
  const [requesting, setRequesting] = useState(false);
  
  // Verificação de autenticação diretamente nesta página
  if (authLoading) {
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
      
      // Solicitar permissão usando a função do hook
      const granted = await requestNotificationPermission();
      
      // Seguir para próxima etapa independentemente do resultado
      // Se o usuário negou a permissão, ele ainda pode continuar usando o app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      
      // Em caso de erro, ainda seguir para o app principal
      router.replace('/(tabs)');
    } finally {
      setRequesting(false);
    }
  };
  
  const handleSkip = () => {
    router.replace('/(tabs)');
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image 
            source={require('@/assets/images/onboarding-welcome.jpg')}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Notificações</Text>
          <Text style={[styles.description, { color: colors.textTertiary }]}>
            Receba alertas importantes sobre pets perdidos na sua região, 
            atualizações de status e mensagens de outros usuários.
          </Text>
        </View>
        
        <View style={styles.benefitsContainer}>
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: isDark ? 'rgba(237, 80, 20, 0.2)' : 'rgba(237, 80, 20, 0.1)' }]}>
              <Ionicons name="alert-circle" size={22} color="#ED5014" />
            </View>
            <View style={styles.benefitText}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>
                Alertas de pets perdidos
              </Text>
              <Text style={[styles.benefitDescription, { color: colors.textTertiary }]}>
                Seja notificado quando um pet for perdido próximo à sua localização
              </Text>
            </View>
          </View>
          
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: isDark ? 'rgba(237, 80, 20, 0.2)' : 'rgba(237, 80, 20, 0.1)' }]}>
              <Ionicons name="chatbubble-ellipses" size={22} color="#ED5014" />
            </View>
            <View style={styles.benefitText}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>
                Mensagens
              </Text>
              <Text style={[styles.benefitDescription, { color: colors.textTertiary }]}>
                Receba notificações de mensagens de outros usuários
              </Text>
            </View>
          </View>
          
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: isDark ? 'rgba(237, 80, 20, 0.2)' : 'rgba(237, 80, 20, 0.1)' }]}>
              <Ionicons name="checkmark-circle" size={22} color="#ED5014" />
            </View>
            <View style={styles.benefitText}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>
                Atualizações de status
              </Text>
              <Text style={[styles.benefitDescription, { color: colors.textTertiary }]}>
                Acompanhe novidades sobre pets perdidos que você está seguindo
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.privacyContainer}>
          <Ionicons name="information-circle-outline" size={20} color={isDark ? '#AAA' : '#777'} />
          <Text style={[styles.privacyText, { color: isDark ? '#AAA' : '#777' }]}>
            Você pode personalizar quais notificações deseja receber nas configurações do aplicativo.
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
                    Permitir Notificações
                  </Text>
                  <Ionicons name="notifications" size={20} color="#FFF" />
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
    marginBottom: 10,
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
    marginBottom: 10,
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