import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging, { firebase } from '@react-native-firebase/messaging';

// Configurar canais de notificação para Android
export const setupNotificationChannels = () => {
  if (Platform.OS === 'android') {
    // Canal para notificações gerais (alta prioridade)
    Notifications.setNotificationChannelAsync('default_channel', {
      name: 'Notificações',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B6B',
    });
    
    // Canal específico para mensagens de chat (com suporte a agrupamento)
    Notifications.setNotificationChannelAsync('chat_channel', {
      name: 'Mensagens de Chat',
      description: 'Notificações de mensagens de chat',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
      // Propriedades adicionais para agrupar notificações
      groupId: 'chat',
      showBadge: true,
    });
    
    // Canal para alertas de pets (alta prioridade)
    Notifications.setNotificationChannelAsync('alert_channel', {
      name: 'Alertas de Pets',
      description: 'Notificações de pets perdidos ou encontrados',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B6B',
      sound: 'default',
    });
  }
};

// Inicializar Firebase se ainda não estiver inicializado
let firebaseInitialized = false;
export const initializeFirebase = () => {
  if (firebaseInitialized) return;
  
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
        authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
        projectId: Constants.expoConfig?.extra?.firebaseProjectId,
        storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
        messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
        appId: Constants.expoConfig?.extra?.firebaseAppId,
        measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId,
      });
      firebaseInitialized = true;
      console.log('Firebase inicializado com sucesso');
    }
  } catch (error) {
    console.error('Erro ao inicializar o Firebase:', error);
  }
}

// Configurar handler de mensagens em background para Android
export const setupBackgroundMessageHandler = () => {
  // Não use aqui a condição if (Platform.OS === 'android')
  // pois essa função já é chamada condicionalmente em outros lugares
  
  // Registra o handler para mensagens em segundo plano quando o app está fechado
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Mensagem recebida em background:', remoteMessage);
    
    // Extrair dados da mensagem (para mensagens de dados e notificação)
    const title = remoteMessage.notification?.title || 
                remoteMessage.data?.title || 
                'Nova notificação';
    
    const body = remoteMessage.notification?.body || 
               remoteMessage.data?.body || 
               remoteMessage.data?.message || 
               '';
    
    // Obter tipo de notificação e IDs para agrupamento
    const type = remoteMessage.data?.type || 'DEFAULT';
    const threadId = remoteMessage.data?.thread_id;
    const chatRoomId = remoteMessage.data?.chatRoomId;
    
    // Criar conteúdo da notificação
    const notificationContent = {
      title: title as string,
      body: body as string,
      data: {
        ...(remoteMessage.data || {}),
        // Adicionar informações de agrupamento nos dados
        threadId: type === 'CHAT' ? (threadId || `chat_${chatRoomId}`) : undefined,
        category: type === 'CHAT' ? 'chat' : 'default'
      },
      sound: true,
      badge: 1,
    } as Notifications.NotificationContentInput;
    
    // Adicionar propriedades específicas para Android e iOS
    if (Platform.OS === 'android') {
      (notificationContent as any).android = {
        channelId: type === 'CHAT' ? 'chat_channel' : 'default_channel'
      };
    } else if (Platform.OS === 'ios' && type === 'CHAT') {
      (notificationContent as any).ios = {
        threadId: threadId || `chat_${chatRoomId}`,
        categoryId: 'chat'
      };
    }
    
    // Criar notificação local para garantir que será exibida
    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // mostrar imediatamente
    });
  });

  // Configurar permissão para notificações em segundo plano (importante!)
  messaging().onMessage(async remoteMessage => {
    console.log('Mensagem recebida em primeiro plano:', remoteMessage);
    
    // Quando em primeiro plano, podemos decidir mostrar ou não uma notificação
    // dependendo do tipo e contexto da mensagem
    const isHighPriorityNotification = 
      remoteMessage.data?.priority === 'high' || 
      remoteMessage.data?.type === 'LOST_PET' ||
      remoteMessage.data?.type === 'FOUND_PET' ||
      remoteMessage.data?.type === 'PET_FOUND';
    
    // Para mensagens de alta prioridade ou tipos específicos, mostrar mesmo em primeiro plano
    if (isHighPriorityNotification) {
      // Extrair dados da mensagem
      const title = remoteMessage.notification?.title || 
                   remoteMessage.data?.title || 
                   'Nova notificação';
      
      const body = remoteMessage.notification?.body || 
                  remoteMessage.data?.body || 
                  remoteMessage.data?.message || 
                  '';
      
      // Obter tipo de notificação e IDs para agrupamento
      const type = remoteMessage.data?.type || 'DEFAULT';
      const threadId = remoteMessage.data?.thread_id;
      const chatRoomId = remoteMessage.data?.chatRoomId;
      
      // Criar conteúdo da notificação
      const notificationContent = {
        title: title as string,
        body: body as string,
        data: {
          ...(remoteMessage.data || {}),
          // Adicionar informações de agrupamento nos dados
          threadId: type === 'CHAT' ? (threadId || `chat_${chatRoomId}`) : undefined,
          category: type === 'CHAT' ? 'chat' : 'default'
        },
        sound: true,
        badge: 1,
      } as Notifications.NotificationContentInput;
      
      // Adicionar propriedades específicas para Android e iOS
      if (Platform.OS === 'android') {
        (notificationContent as any).android = {
          channelId: type === 'CHAT' ? 'chat_channel' : 'default_channel'
        };
      } else if (Platform.OS === 'ios' && type === 'CHAT') {
        (notificationContent as any).ios = {
          threadId: threadId || `chat_${chatRoomId}`,
          categoryId: 'chat'
        };
      }
      
      // Criar notificação local
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // mostrar imediatamente
      });
    }
  });
}

// Tipo para notificações
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  image?: string;
  read: boolean;
  createdAt: string;
  priority?: 'normal' | 'high';
}

// Configuração de como as notificações devem aparecer para o usuário
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Verificar se o dispositivo pode receber notificações
export async function checkNotificationPermission() {
  if (!Device.isDevice) {
    return false; // Não é um dispositivo físico (provavelmente um emulador)
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

// Registrar o dispositivo para receber notificações push
export async function registerForPushNotifications() {
  try {
    // Inicializar Firebase primeiro (importante)
    initializeFirebase();
    
    // Configurar canais de notificação (especialmente para Android)
    setupNotificationChannels();
    
    const permissionGranted = await checkNotificationPermission();
    if (!permissionGranted) {
      console.log('Permissão para notificações foi negada');
      return false;
    }

    // Configurar handler de background para Android
    // É importante chamar isso o mais cedo possível no ciclo de vida do app
    setupBackgroundMessageHandler();

    let token;
    // Verificar permissões e obter token específico para Android
    if (Platform.OS === 'android') {
      // No Android, precisamos de permissão explícita para o FCM
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('Permissão para notificações push negada no Android');
        return false;
      }
      
      // Garantir que o dispositivo esteja registrado para mensagens remotas
      await messaging().registerDeviceForRemoteMessages();
      
      // Para Android, usar preferencialmente o token FCM nativo em vez do Expo
      try {
        token = await messaging().getToken();
        console.log('Token FCM obtido com sucesso:', token);
      } catch (fcmError) {
        console.error('Erro ao obter token FCM:', fcmError);
        
        // Fallback para token Expo em caso de falha no FCM
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || "1a2b3c4d-5e6f-7g8h-9i10-11j12k13l14m";
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      }
    } else {
      // iOS: garantir registro para mensagens remotas primeiro
      try {
        await messaging().registerDeviceForRemoteMessages();
        console.log('Dispositivo iOS registrado para mensagens remotas');
      } catch (error) {
        console.warn('Erro ao registrar para mensagens remotas iOS:', error);
        // Continuar mesmo com erro, pois pode funcionar em alguns casos
      }

      // iOS: obter token FCM nativo
      try {
        token = await messaging().getToken();
        console.log('Token FCM iOS obtido com sucesso:', token);
      } catch (fcmError) {
        console.error('Erro ao obter token FCM iOS:', fcmError);
        
        // Fallback para token Expo
        try {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId || "1a2b3c4d-5e6f-7g8h-9i10-11j12k13l14m";
          const expoPushToken = await Notifications.getExpoPushTokenAsync({
            projectId: projectId,
          });
          token = expoPushToken.data;
        } catch (tokenError) {
          console.warn("Falha ao obter token com projectId, tentando sem projectId:", tokenError);
          
          // Tenta obter token sem o projectId (modo de compatibilidade)
          const expoPushToken = await Notifications.getExpoPushTokenAsync();
          token = expoPushToken.data;
        }
      }
    }

    if (!token) {
      console.error('Não foi possível obter um token de notificação');
      return false;
    }

    // Obter informações do dispositivo
    const deviceId = Device.deviceName || await Device.getDeviceTypeAsync();
    const platform = Platform.OS;

    console.log('Token obtido com sucesso:', token);

    // Enviar token para o servidor
    try {
      await api.post('/notifications/push-token', {
        token: token,
        deviceId,
        platform
      });

      // Armazenar localmente para referência futura
      await AsyncStorage.setItem('pushToken', token);
      
      console.log('Token de push registrado com sucesso no servidor');
      return true;
    } catch (apiError) {
      console.error('Erro ao registrar token no servidor:', apiError);
      return false;
    }
  } catch (error) {
    console.error('Erro ao registrar para notificações push:', error);
    return false;
  }
}

// Remover registro de notificações push (ao fazer logout)
export async function unregisterPushNotifications() {
  try {
    const token = await AsyncStorage.getItem('pushToken');
    if (token) {
      // Uso correto da função del enviando o token diretamente no corpo
      await api.del('/notifications/push-token', { token });
      await AsyncStorage.removeItem('pushToken');
      console.log('Token de push removido com sucesso');
    }
    return true;
  } catch (error) {
    console.error('Erro ao remover registro de notificações push:', error);
    return false;
  }
}

// Configurar ouvintes para notificações recebidas
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponseReceived?: (response: Notifications.NotificationResponse) => void
) {
  // Ouvinte para notificações recebidas quando o app está em primeiro plano
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Ouvinte para quando o usuário toca em uma notificação
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    if (onNotificationResponseReceived) {
      onNotificationResponseReceived(response);
    }
    // Processar os dados da notificação e navegar para a tela apropriada
    handleNotificationNavigation(response.notification);
  });

  return {
    removeListeners: () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    }
  };
}

// Função para processar navegação baseada na notificação
function handleNotificationNavigation(notification: Notifications.Notification) {
  if (!notification.request.content.data) return;
  
  const data = notification.request.content.data;
  const type = data.type;

  // Navegar com base no tipo de notificação
  switch(type) {
    case 'CHAT':
      // Navegar para o chat
      console.log('Abrir chat:', data.chatRoomId);
      if (data.chatRoomId) {
        router.push(`/chat/${data.chatRoomId}`);
      }
      break;
    case 'LOST_PET':
      // Navegar para detalhes de pet perdido
      console.log('Abrir detalhes de pet perdido:', data.alertId);
      if (data.alertId) {
        router.push({
          pathname: '/pet/lost-details/[id]',
          params: { id: data.alertId }
        });
      }
      break;
    case 'FOUND_PET':
      // Navegar para detalhes de pet encontrado
      console.log('Abrir detalhes de pet encontrado:', data.alertId);
      if (data.alertId) {
        router.push({
          pathname: '/pet/found-details/[id]',
          params: { id: data.alertId }
        });
      }
      break;
    case 'LIKE':
    case 'COMMENT':
      // Navegar para o post
      console.log('Abrir post:', data.postId);
      if (data.postId) {
        router.push({
          pathname: '/post/[id]',
          params: { id: data.postId }
        });
      }
      break;
    case 'FOLLOW':
      // Navegar para o perfil do usuário que começou a seguir
      console.log('Abrir perfil do seguidor:', data.followerId);
      if (data.followerId) {
        router.push({
          pathname: '/profile/[id]',
          params: { id: data.followerId }
        });
      } else if (data.screenParams?.id) {
        // Compatibilidade com formato antigo
        router.push({
          pathname: '/profile/[id]',
          params: { id: data.screenParams.id }
        });
      }
      break;
    case 'CLAIM':
      // Navegar para a reivindicação
      console.log('Abrir reivindicação:', data.claimId);
      if (data.claimId) {
        router.push({
          pathname: '/claims/[id]',
          params: { id: data.claimId }
        });
      }
      break;
    case 'PET_SIGHTING':
      // Navegar para a tela de detalhes do alerta onde o pet foi avistado
      console.log('Pet avistado:', data.alertId);
      if (data.alertId) {
        router.push({
          pathname: '/pet/lost-details/[id]',
          params: { id: data.alertId }
        });
      }
      break;
    case 'PET_FOUND':
      // Navegar para a tela de detalhes do alerta onde o pet foi encontrado
      console.log('Pet encontrado! Abrindo detalhes:', data.alertId);
      if (data.alertId) {
        // Navegar para a mesma tela de detalhes, mas com um parâmetro adicional
        router.push({
          pathname: '/pet/lost-details/[id]',
          params: { 
            id: data.alertId,
            showSightings: 'true', // Para abrir automaticamente a seção de avistamentos
            highlight: data.sightingId // Para destacar o avistamento específico
          }
        });
      }
      break;
    case 'SYSTEM':
      // Notificações do sistema geralmente só exibem mensagem
      console.log('Notificação do sistema:', data.message);
      // Se houver uma tela especificada, navegar para ela
      if (data.screen) {
        try {
          const screen = data.screen;
          const params = data.screenParams || {};
          
          // Construir a rota com parâmetros, se houver
          if (Object.keys(params).length > 0) {
            const queryParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
              queryParams.append(key, String(value));
            });
            router.push(`${screen}?${queryParams.toString()}`);
          } else {
            router.push(screen);
          }
        } catch (error) {
          console.error('Erro ao navegar para tela de notificação do sistema:', error);
        }
      }
      break;
    default:
      console.log('Tipo de notificação desconhecido ou não tratado:', type);
      break;
  }
}

// Buscar notificações
export const fetchNotifications = async (): Promise<Notification[]> => {
  try {
    const response = await api.get('/notifications');
    return response.data || [];
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    throw error;
  }
};

// Marcar notificação como lida
export const markNotificationAsRead = async (notificationId: string): Promise<any> => {
  try {
    return await api.put(`/notifications/${notificationId}/read`);
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    throw error;
  }
};

// Marcar todas as notificações como lidas
export const markAllNotificationsAsRead = async (): Promise<any> => {
  try {
    return await api.put('/notifications/read-all');
  } catch (error) {
    console.error('Erro ao marcar todas notificações como lidas:', error);
    throw error;
  }
}

// Função para agendar uma notificação local (funciona mesmo no Expo Go quando o app está fechado)
export async function scheduleLocalNotification(
  title: string, 
  body: string, 
  data: any = {}, 
  delayInSeconds: number = 5
): Promise<string | null> {
  try {
    // Verificar permissões antes
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permissão para notificações não concedida');
      return null;
    }
    
    // Programar notificação para aparecer após o delay especificado
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        badge: 1
      },
      // Use o construtor de trigger correto
      trigger: delayInSeconds > 0 ? { seconds: delayInSeconds } as any : null
    });
    
    console.log(`Notificação local agendada com ID: ${identifier}`);
    return identifier;
  } catch (error) {
    console.error('Erro ao agendar notificação local:', error);
    return null;
  }
}

// Função híbrida para garantir que notificações importantes sejam entregues mesmo no Expo Go
export async function sendHybridNotification(params: {
  userId: string;
  title: string;
  message: string;
  data?: any;
  type: string;
  imageUrl?: string;
}): Promise<void> {
  try {
    // 1. Armazenar a notificação localmente para ser exibida
    const storedNotifications = await AsyncStorage.getItem('pendingNotifications');
    const pendingNotifications = storedNotifications ? JSON.parse(storedNotifications) : [];
    
    const newNotification = {
      id: Date.now().toString(),
      title: params.title,
      message: params.message,
      data: params.data || {},
      type: params.type,
      imageUrl: params.imageUrl,
      timestamp: new Date().toISOString(),
    };
    
    pendingNotifications.push(newNotification);
    await AsyncStorage.setItem('pendingNotifications', JSON.stringify(pendingNotifications));
    
    // 2. Se estiver em desenvolvimento (Expo Go), agendar uma notificação local como teste
    if (__DEV__) {
      await scheduleLocalNotification(
        params.title,
        params.message,
        {
          ...params.data,
          type: params.type,
          imageUrl: params.imageUrl
        },
        10 // Agendar para 10 segundos depois
      );
    }
  } catch (error) {
    console.error('Erro ao enviar notificação híbrida:', error);
  }
}

// Função para verificar notificações pendentes quando o app é aberto
export async function checkPendingNotifications(): Promise<any[]> {
  try {
    const storedNotifications = await AsyncStorage.getItem('pendingNotifications');
    if (!storedNotifications) return [];
    
    const pendingNotifications = JSON.parse(storedNotifications);
    
    // Limpar notificações pendentes após processá-las
    await AsyncStorage.removeItem('pendingNotifications');
    
    return pendingNotifications;
  } catch (error) {
    console.error('Erro ao verificar notificações pendentes:', error);
    return [];
  }
}