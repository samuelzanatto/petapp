import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { BackgroundTaskResult } from 'expo-background-task';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import { router } from 'expo-router';

// Definição de constantes
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';
const BACKGROUND_REFRESH_INTERVAL = 15 * 60; // 15 minutos

// Definir a tarefa de background para verificar notificações
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  try {
    console.log('[Background Task] Verificando notificações em segundo plano');
    // Verificar se há token disponível
    const token = await AsyncStorage.getItem('pushToken');
    if (!token) {
      console.log('[Background Task] Token não encontrado');
      return BackgroundTaskResult.Failed;
    }
    
    // Verificar por notificações pendentes
    const pendingNav = await AsyncStorage.getItem('pendingNotificationNavigation');
    if (pendingNav) {
      console.log('[Background Task] Notificação pendente encontrada');
      return BackgroundTaskResult.Success;
    }
    
    return BackgroundTaskResult.Success;
  } catch (error) {
    console.error('[Background Task] Erro na tarefa de verificação:', error);
    return BackgroundTaskResult.Failed;
  }
});

// Registrar a tarefa de background
export async function registerBackgroundTask() {
  try {
    // Verificar se já está registrada
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    if (isRegistered) {
      console.log('[Background] Tarefa já registrada');
      return true;
    }
    
    await BackgroundTask.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
      minimumInterval: BACKGROUND_REFRESH_INTERVAL
    });
    
    console.log('[Background] Tarefa de background registrada com sucesso');
    return true;
  } catch (err) {
    console.error('[Background] Erro ao registrar tarefa de background:', err);
    return false;
  }
}

// Configurar handler de mensagens para iOS
export const setupIOSBackgroundHandlers = () => {
  // Solicitar permissão para iOS
  messaging().requestPermission().then(authStatus => {
    const enabled = 
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
    if (enabled) {
      console.log('[iOS] Permissão de notificações concedida');
      
      // Configurar notificações quando o app está em background
      messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('[iOS] Notificação aberta com app em background:', remoteMessage);
        if (remoteMessage.data) {
          processNotificationData(remoteMessage.data);
        }
      });
    } else {
      console.log('[iOS] Permissão de notificações negada');
    }
  });
};

// Processar dados de notificação e executar navegação
export function processNotificationData(notificationData: any) {
  if (!notificationData) {
    console.log('[Notification] Dados de notificação vazios');
    return;
  }
  
  console.log('[Notification] Processando dados:', JSON.stringify(notificationData));
  
  // Se o app não estiver em primeiro plano, armazenar para processamento posterior
  if (AppState.currentState !== 'active') {
    console.log('[Notification] App não ativo, armazenando navegação para posterior');
    AsyncStorage.setItem('pendingNotificationNavigation', JSON.stringify({
      data: notificationData,
      timestamp: new Date().getTime()
    }));
    return;
  }
  
  // Processar a navegação com base no tipo de notificação
  const type = notificationData.type;
  
  switch(type) {
    case 'CHAT':
      if (notificationData.chatRoomId) {
        router.push(`/chat/${notificationData.chatRoomId}`);
      }
      break;
    case 'LOST_PET':
    case 'PET_SIGHTING':
      if (notificationData.alertId) {
        router.push({
          pathname: '/pet/lost-details/[id]',
          params: { id: notificationData.alertId }
        });
      }
      break;
    case 'FOUND_PET':
      if (notificationData.alertId) {
        router.push({
          pathname: '/pet/lost-details/[id]',
          params: { id: notificationData.alertId }
        });
      }
      break;
    case 'PET_FOUND':
      if (notificationData.alertId) {
        router.push({
          pathname: '/pet/lost-details/[id]',
          params: { 
            id: notificationData.alertId,
            showSightings: 'true',
            highlight: notificationData.sightingId
          }
        });
      }
      break;
    case 'LIKE':
    case 'COMMENT':
      if (notificationData.postId) {
        router.push({
          pathname: '/post/[id]',
          params: { id: notificationData.postId }
        });
      }
      break;    case 'FOLLOW':
      // Use qualquer um dos possíveis IDs de usuário disponíveis no payload
      if (notificationData.followerId || notificationData.userData?.id || notificationData.screenParams?.id) {
        const userId = notificationData.followerId || notificationData.userData?.id || notificationData.screenParams?.id;
        console.log('Navegando para perfil de seguidor (background):', userId);
        router.push({
          pathname: '/profile/[id]',
          params: { id: userId }
        });
      }
      break;
    case 'CLAIM':
      if (notificationData.claimId) {
        router.push({
          pathname: '/claims/[id]',
          params: { id: notificationData.claimId }
        });
      }
      break;
    case 'SYSTEM':
      if (notificationData.screen) {
        router.push(notificationData.screen);
      }
      break;
  }
}

// Verificar e processar notificações pendentes (chamado ao abrir o app ou retornar ao primeiro plano)
export async function checkPendingNotifications(): Promise<boolean> {
  try {
    const pendingNavStr = await AsyncStorage.getItem('pendingNotificationNavigation');
    if (!pendingNavStr) return false;
    
    const pendingNav = JSON.parse(pendingNavStr);
    const now = new Date().getTime();
    
    // Processar apenas notificações recentes (últimas 30 minutos)
    if (now - pendingNav.timestamp < 30 * 60 * 1000) {
      if (AppState.currentState === 'active') {
        processNotificationData(pendingNav.data);
        await AsyncStorage.removeItem('pendingNotificationNavigation');
        return true;
      }
    } else {
      // Notificação muito antiga, limpar
      await AsyncStorage.removeItem('pendingNotificationNavigation');
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao verificar notificações pendentes:', error);
    return false;
  }
}

// Inicializar todos os handlers de background
export function initializeBackgroundHandlers() {
  // Registrar tarefa de background
  registerBackgroundTask();
  
  // Configurar handlers específicos para iOS
  if (Platform.OS === 'ios') {
    setupIOSBackgroundHandlers();
  }
  
  // Registrar para poder receber notificações push mesmo com o app fechado
  messaging().registerDeviceForRemoteMessages()
    .then(() => console.log('Dispositivo registrado para mensagens remotas'))
    .catch(err => console.error('Erro ao registrar para mensagens remotas:', err));
  
  // Para Android, verificar permissões específicas de notificação (Android 13+)
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    messaging().requestPermission()
      .then(status => {
        const enabled = 
          status === messaging.AuthorizationStatus.AUTHORIZED ||
          status === messaging.AuthorizationStatus.PROVISIONAL;
        console.log(`[Android] Permissão de notificações: ${enabled ? 'concedida' : 'negada'}`);
      })
      .catch(err => console.error('[Android] Erro ao solicitar permissão:', err));
  }
  
  // Configurar listener para mudanças no estado do app
  AppState.addEventListener('change', nextAppState => {
    if (nextAppState === 'active') {
      // App voltou ao primeiro plano, verificar por notificações pendentes
      checkPendingNotifications();
    }
  });
  
  // Verificar se o app foi aberto a partir de uma notificação (comum para ambas plataformas)
  messaging().getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('App aberto a partir de notificação (app fechado):', remoteMessage);
        processNotificationData(remoteMessage.data);
      }
    });
  
  console.log('[Background] Handlers de fundo inicializados com sucesso');
}
