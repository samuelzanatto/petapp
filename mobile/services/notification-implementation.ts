import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

type NotificationDataType = {
  [key: string]: any;
  type?: string;
  thread_id?: string;
  chatRoomId?: string;
};

/**
 * Configura o gerenciamento de notificações em segundo plano
 * com suporte a agrupamento de notificações de chat
 * 
 * Implementa o agrupamento de notificações de acordo com a documentação do Expo:
 * - No Android: Usa android.channelId para definir o canal correto
 * - No iOS: Usa ios.threadId para agrupar por conversa
 * - Armazena também os dados de agrupamento no objeto data para processamento posterior
 */
export const setupBackgroundMessageHandler = (): void => {
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
    const data = remoteMessage.data as NotificationDataType || {};
    const type = data.type || 'DEFAULT';
    const threadId = data.thread_id;
    const chatRoomId = data.chatRoomId;
      // Criar conteúdo da notificação com base na plataforma
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
      trigger: null // mostrar imediatamente
    });
  });

  // Configurar handler para mensagens em primeiro plano
  messaging().onMessage(async remoteMessage => {
    console.log('Mensagem recebida em primeiro plano:', remoteMessage);
    
    // Verificar se a notificação deve ser mostrada em primeiro plano
    const data = remoteMessage.data as NotificationDataType || {};
    const isHighPriorityNotification = 
      data.priority === 'high' || 
      data.type === 'LOST_PET' ||
      data.type === 'FOUND_PET' ||
      data.type === 'PET_FOUND' ||
      data.type === 'CHAT';
    
    // Mostrar notificação apenas se for de alta prioridade
    if (isHighPriorityNotification) {
      // Extrair dados da mensagem
      const title = remoteMessage.notification?.title || 
                   data.title || 
                   'Nova notificação';
      
      const body = remoteMessage.notification?.body || 
                  data.body || 
                  data.message || 
                  '';      // Criar conteúdo da notificação
      const type = data.type || 'DEFAULT';
      const threadId = data.thread_id;
      const chatRoomId = data.chatRoomId;
      
      // Criar conteúdo da notificação com base na plataforma
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
        trigger: null // mostrar imediatamente
      });
    }
  });
};
