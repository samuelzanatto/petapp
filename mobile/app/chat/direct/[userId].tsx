import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/contexts/theme';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { ThemedCard } from '@/components/ThemedCard';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DirectChatRedirect() {
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{title: string, message: string} | null>(null);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Tenta criar ou obter um chat direto com o usuário
        const response = await api.get(`/chat/direct/${userId}`);
        
        if (response && response.chatRoomId) {
          // Redireciona para a tela de chat com o ID da sala
          router.replace(`/chat/${response.chatRoomId}`);
        } else {
          throw new Error('Falha ao criar sala de chat');
        }
      } catch (error: any) {
        console.error('Erro ao inicializar chat:', error);
        setLoading(false);
        
        // Define o erro com base na resposta do servidor
        if (error.message && error.message.includes('reivindicação aprovada')) {
          setError({
            title: 'Chat não disponível',
            message: 'Você só pode iniciar um chat com este usuário se existir uma reivindicação aprovada entre vocês.'
          });
        } else {
          setError({
            title: 'Erro ao inicializar chat',
            message: 'Não foi possível iniciar o chat. Tente novamente mais tarde.'
          });
        }
      }
    };

    if (userId) {
      initializeChat();
    } else {
      setLoading(false);
      setError({
        title: 'Erro',
        message: 'ID do usuário inválido'
      });
    }
  }, [userId]);

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemedCard style={styles.errorCard}>
          <View style={styles.errorIconContainer}>
            <Ionicons 
              name="alert-circle" 
              size={60} 
              color={colors.primary} 
              style={styles.errorIcon}
            />
          </View>
          <ThemedText style={styles.errorTitle}>{error.title}</ThemedText>
          <ThemedText style={styles.errorMessage}>{error.message}</ThemedText>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.backButtonText}>Voltar</ThemedText>
          </TouchableOpacity>
        </ThemedCard>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <ThemedText style={styles.loadingText}>
        Inicializando chat...
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  errorCard: {
    width: '90%',
    padding: 20,
    alignItems: 'center',
    borderRadius: 15,
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  errorIcon: {
    // O glow será definido pela cor primária
    textShadowColor: 'rgba(255, 107, 107, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 10,
    // Efeito de glow compatível com o tema do app
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.5,
    elevation: 5,
  },
  backButtonText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  }
});