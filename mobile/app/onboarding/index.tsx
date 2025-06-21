import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/theme';
import { useAuth } from '@/contexts/auth';
import { ActivityIndicator } from 'react-native';

export default function Onboarding() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, loading } = useAuth();
  
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
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Image 
          source={require('@/assets/images/onboarding-welcome.jpg')} 
          style={styles.image}
          resizeMode="cover"
        />
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Bem-vindo ao PetApp</Text>
          <Text style={[styles.description, { color: colors.textTertiary }]}>
            Vamos começar configurando algumas informações importantes para 
            o caso do seu pet se perder.
          </Text>
        </View>
        
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: isDark ? 'rgba(237, 80, 20, 0.2)' : 'rgba(237, 80, 20, 0.1)' }]}>
              <Ionicons name="paw" size={24} color="#ED5014" />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Cadastre seu Pet</Text>
              <Text style={[styles.featureDescription, { color: colors.textTertiary }]}>
                Adicione informações e foto do seu pet para facilitar sua identificação
              </Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: isDark ? 'rgba(237, 80, 20, 0.2)' : 'rgba(237, 80, 20, 0.1)' }]}>
              <Ionicons name="location" size={24} color="#ED5014" />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Localização</Text>
              <Text style={[styles.featureDescription, { color: colors.textTertiary }]}>
                Permita o acesso à sua localização para encontrar pets perdidos perto de você
              </Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: isDark ? 'rgba(237, 80, 20, 0.2)' : 'rgba(237, 80, 20, 0.1)' }]}>
              <Ionicons name="notifications" size={24} color="#ED5014" />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Notificações</Text>
              <Text style={[styles.featureDescription, { color: colors.textTertiary }]}>
                Receba alertas sobre pets perdidos em sua região
              </Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push('/onboarding/pet-info')}
        >
          <Text style={styles.buttonText}>Começar</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
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
  image: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginTop: 40,
    marginBottom: 20,
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
  features: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    height: 56,
    borderRadius: 12,
    backgroundColor: '#ED5014',
    overflow: 'hidden',
    marginTop: 'auto',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
});