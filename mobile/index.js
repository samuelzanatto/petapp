import 'expo-router/entry';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { initializeBackgroundHandlers } from './services/backgroundNotifications';
import { initializeFirebase } from './services/notifications';

// Criar canais de notificação no Android
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
    showBadge: true,
  });
}

// Inicializar Firebase primeiro
initializeFirebase();

// Configurar o handler de mensagens em background como a primeira coisa no app
// Isso é crucial para que as notificações funcionem com o app fechado
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[BACKGROUND] Mensagem recebida:', JSON.stringify(remoteMessage));
  
  // Mostrar notificação local mesmo no background
  if (remoteMessage.notification || remoteMessage.data) {
    // Processar os dados do remoteMessage
    const notificationTitle = remoteMessage.notification?.title || 
                             remoteMessage.data?.title || 
                             'Nova notificação';
    
    const notificationBody = remoteMessage.notification?.body || 
                            remoteMessage.data?.body || 
                            remoteMessage.data?.message || 
                            '';    
    console.log(`[BACKGROUND] Criando notificação local: ${notificationTitle} - ${notificationBody}`);
      // Obter tipo de notificação e IDs para agrupamento
    const type = remoteMessage.data?.type || 'DEFAULT';
    const threadId = remoteMessage.data?.thread_id;
    const chatRoomId = remoteMessage.data?.chatRoomId;
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationTitle,
        body: notificationBody,
        data: remoteMessage.data || {},
        sound: true,
        badge: 1,
        // Adicionar suporte para agrupamento de notificações
        channelId: type === 'CHAT' ? 'chat_channel' : 'default_channel',
        // Configurações de agrupamento
        categoryIdentifier: type === 'CHAT' ? 'chat' : 'default',
        threadId: threadId || (type === 'CHAT' ? `chat_${chatRoomId}` : undefined)
      },
      trigger: null // mostrar imediatamente
    });
  }
});

// Configurar como as notificações são mostradas
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Inicializar handlers para background
initializeBackgroundHandlers();