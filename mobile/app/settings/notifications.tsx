import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { H2, Body, Bold } from '@/components/Typography';
import { useTheme } from '@/contexts/theme';
import { useNotifications, checkNotificationPermission, registerForPushNotifications } from '@/services/notifications';
import { api } from '@/services/api';

// Interface para configurações de notificações
interface NotificationSettings {
  pushEnabled: boolean;
  chatMessages: boolean;
  lostPets: boolean;
  foundPets: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  claims: boolean;
  marketing: boolean;
  emailNotifications: boolean;
}

// Estado inicial de configurações
const defaultSettings: NotificationSettings = {
  pushEnabled: true,
  chatMessages: true,
  lostPets: true,
  foundPets: true,
  likes: true,
  comments: true,
  follows: true,
  claims: true,
  marketing: false,
  emailNotifications: false,
};

export default function NotificationsSettingsScreen() {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [showError, setShowError] = useState(false);
  
  // Efeito para carregar configurações e verificar permissões
  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);
  
  // Carregar configurações do AsyncStorage
  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('notificationSettings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      } else {
        // Se não existirem configurações, usar os padrões e salvar
        await saveSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de notificações:', error);
    }
  };
  
  // Salvar configurações no AsyncStorage e no servidor
  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      setIsSaving(true);
      setShowError(false);
      
      // Salvar localmente
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      
      // Salvar no servidor (implementação futura)
      // await api.put('/notifications/settings', newSettings);
      
      // Se as notificações foram desativadas, limpar o badge
      if (!newSettings.pushEnabled) {
        await Notifications.setBadgeCountAsync(0);
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setShowError(true);
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  // Verificar permissões de notificação
  const checkPermissions = async () => {
    setLoading(true);
    const hasPermission = await checkNotificationPermission();
    setPermissionGranted(hasPermission);
    
    // Se as permissões não estiverem concedidas, desativar notificações push
    if (!hasPermission && settings.pushEnabled) {
      const newSettings = { ...settings, pushEnabled: false };
      saveSettings(newSettings);
    }
    setLoading(false);
  };
  
  // Solicitar permissões novamente
  const requestPermission = async () => {
    setLoading(true);
    try {
      const granted = await registerForPushNotifications();
      setPermissionGranted(granted);
      
      if (granted) {
        // Atualizar configurações se a permissão for concedida
        const newSettings = { ...settings, pushEnabled: true };
        await saveSettings(newSettings);
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Alternar configuração específica
  const toggleSetting = async (key: keyof NotificationSettings) => {
    if (key === 'pushEnabled' && !permissionGranted && !settings[key]) {
      // Se tentar ativar notificações push e não tiver permissão, solicitar
      await requestPermission();
      return;
    }
    
    const newSettings = { ...settings, [key]: !settings[key] };
    
    // Se desabilitar notificações push, desabilitar também todas as opções dependentes
    if (key === 'pushEnabled' && !newSettings.pushEnabled) {
      newSettings.chatMessages = false;
      newSettings.lostPets = false;
      newSettings.foundPets = false;
      newSettings.likes = false;
      newSettings.comments = false;
      newSettings.follows = false;
      newSettings.claims = false;
    }
    
    await saveSettings(newSettings);
  };
  
  // Renderizar opção de notificação com interruptor
  const renderOption = (
    key: keyof NotificationSettings,
    title: string,
    description: string,
    disabled = false
  ) => {
    return (
      <View style={[
        styles.optionContainer, 
        { borderBottomColor: colors.divider }
      ]}>
        <View style={styles.optionTextContainer}>
          <ThemedText style={styles.optionTitle}>{title}</ThemedText>
          <ThemedText style={[
            styles.optionDescription, 
            disabled && { opacity: 0.5 }
          ]}>
            {description}
          </ThemedText>
        </View>
        <Switch
          trackColor={{ false: isDark ? '#4D4D4D' : '#D9D9D9', true: '#FF6B6B99' }}
          thumbColor={settings[key] ? '#FF6B6B' : isDark ? '#FFFFFF' : '#F5F5F5'}
          ios_backgroundColor={isDark ? '#4D4D4D' : '#D9D9D9'}
          onValueChange={() => toggleSetting(key)}
          value={settings[key]}
          disabled={disabled || (key !== 'pushEnabled' && !settings.pushEnabled)}
        />
      </View>
    );
  };
  
  // Renderizar estado de carregando
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Notificações' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <ThemedText style={styles.loadingText}>Verificando permissões...</ThemedText>
        </View>
      </ThemedView>
    );
  }
  
  // Renderizar estado de erro de permissão
  if (permissionGranted === false) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Notificações' }} />
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off" size={70} color={colors.error} />
          <ThemedText style={styles.emptyTitle}>Permissão Negada</ThemedText>
          <ThemedText style={styles.emptyMessage}>
            Você negou a permissão para enviar notificações. Para ativá-las, 
            você precisa alterar as configurações do aplicativo no seu dispositivo.
          </ThemedText>
          <ThemedText style={styles.errorMessage}>
            Acesse as configurações do seu dispositivo, encontre o PetApp e 
            permita o envio de notificações.
          </ThemedText>
          
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
            onPress={requestPermission}
          >
            <ThemedText style={styles.retryButtonText}>
              Tentar Novamente
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }
  
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Configurações de Notificações' }} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {showError && (
          <ThemedCard style={[styles.errorCard, { borderColor: colors.error }]}>
            <View style={styles.errorCardContent}>
              <Ionicons name="alert-circle" size={24} color={colors.error} />
              <ThemedText style={[styles.errorCardText, { color: colors.error }]}>
                Ocorreu um erro ao salvar suas preferências. Tente novamente mais tarde.
              </ThemedText>
            </View>
          </ThemedCard>
        )}
        
        <ThemedCard style={styles.card}>
          <H2>Notificações Push</H2>
          <Body style={styles.sectionDescription}>
            Configure quais notificações você deseja receber diretamente no seu dispositivo.
          </Body>
          
          {renderOption(
            'pushEnabled',
            'Ativar Notificações Push',
            'Receba alertas mesmo quando o aplicativo estiver fechado',
            false
          )}
          
          <View style={styles.divider} />
          
          <ThemedText style={styles.groupTitle}>Alertas de Pet</ThemedText>
          {renderOption(
            'lostPets',
            'Pets Perdidos',
            'Alertas de pets perdidos próximos à sua localização',
            !settings.pushEnabled
          )}
          
          {renderOption(
            'foundPets',
            'Pets Encontrados',
            'Alertas quando alguém encontrar um pet com características similares aos seus pets perdidos',
            !settings.pushEnabled
          )}
          
          {renderOption(
            'claims',
            'Reivindicações de Pet',
            'Quando alguém reivindicar seu pet perdido ou houver atualizações sobre sua reivindicação',
            !settings.pushEnabled
          )}
          
          <View style={styles.divider} />
          
          <ThemedText style={styles.groupTitle}>Social</ThemedText>
          {renderOption(
            'chatMessages',
            'Mensagens de Chat',
            'Notificações quando você receber novas mensagens',
            !settings.pushEnabled
          )}
          
          {renderOption(
            'likes',
            'Curtidas',
            'Quando alguém curtir suas publicações',
            !settings.pushEnabled
          )}
          
          {renderOption(
            'comments',
            'Comentários',
            'Quando alguém comentar em suas publicações',
            !settings.pushEnabled
          )}
          
          {renderOption(
            'follows',
            'Novos Seguidores',
            'Quando alguém começar a seguir você',
            !settings.pushEnabled
          )}
        </ThemedCard>
        
        <ThemedCard style={styles.card}>
          <H2>Outras Notificações</H2>
          
          {renderOption(
            'emailNotifications',
            'Notificações por Email',
            'Receba atualizações importantes por email',
            false
          )}
          
          {renderOption(
            'marketing',
            'Novidades e Promoções',
            'Receba informações sobre atualizações e ofertas do PetApp',
            false
          )}
        </ThemedCard>
        
        {isSaving && (
          <View style={styles.savingContainer}>
            <ActivityIndicator size="small" color={colors.accent} />
            <ThemedText style={styles.savingText}>Salvando preferências...</ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    paddingTop: 60,
  },
  card: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  optionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    marginVertical: 16,
    opacity: 0.1,
    width: '100%',
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  errorCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorCardText: {
    marginLeft: 12,
    flex: 1,
  },
  savingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  savingText: {
    marginLeft: 12,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 15,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
  },
  retryButton: {
    backgroundColor: '#ED9A70',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});