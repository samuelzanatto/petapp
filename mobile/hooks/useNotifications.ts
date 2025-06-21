import { useEffect, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { getSocket } from '../services/socket';
import { 
  Notification, 
  fetchNotifications as apiFetchNotifications,
  markNotificationAsRead as apiMarkAsRead,
  markAllNotificationsAsRead as apiMarkAllAsRead,
  setupNotificationChannels,
  registerForPushNotifications,
  setupNotificationListeners,
  unregisterPushNotifications,
  checkPendingNotifications
} from '../services/notifications';
import { api } from '../services/api';
import { useAuth } from '../contexts/auth';

// Função de teste para agrupamento de notificações
export const testNotificationGrouping = async (chatRoomId = 'test-123', senderName = 'Usuário Teste') => {
  try {
    // Garantir que os canais estejam configurados
    setupNotificationChannels();
    
    // Mensagens de teste para enviar em sequência
    const testMessages = [
      'Primeira mensagem de teste',
      'Segunda mensagem para testar agrupamento',
      'Terceira mensagem para verificar o agrupamento'
    ];
    
    // Enviar várias notificações com pequeno atraso entre elas
    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i];
      
      // Dados comuns para agrupamento
      const notificationData = {
        type: 'CHAT',
        chatRoomId,
        senderId: 'test-user',
        sender_name: senderName,
        thread_id: `chat_${chatRoomId}`,
        group_key: `chat_${chatRoomId}`,
        group_id: `chat_${chatRoomId}`,
        category: 'CHAT',
        collapse_key: `chat_${chatRoomId}`
      };

      // Adaptações para Android específicas
      if (Platform.OS === 'android') {
        // No Android, definimos o canal diretamente no serviço de notificações
        // antes de enviar a notificação
        await Notifications.setNotificationChannelAsync('chat_channel', {
          name: 'Mensagens de Chat',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
          showBadge: true,
        });
      }
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Mensagem de ${senderName}`,
          body: message,
          data: {
            ...notificationData,
            categoryId: 'chat',
            threadId: `chat_${chatRoomId}`
          },
          sound: true,
          badge: 1
        },
        trigger: null // Mostrar imediatamente
      });
      
      console.log(`Notificação de teste ${i+1} enviada`);
      
      // Usar um atraso manual entre notificações
      if (i < testMessages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    Alert.alert(
      'Teste iniciado',
      `${testMessages.length} notificações foram exibidas. Observe como elas são agrupadas.`
    );
    
    return true;
  } catch (error) {
    console.error('Erro ao testar agrupamento de notificações:', error);
    Alert.alert('Erro', 'Não foi possível testar o agrupamento de notificações');
    return false;
  }
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const socket = getSocket();

  // Buscar notificações do servidor ou do armazenamento local
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Primeiro tente buscar do armazenamento local
      const storedNotifications = await AsyncStorage.getItem('notifications');
      let notificationsList: Notification[] = [];
      
      if (storedNotifications) {
        notificationsList = JSON.parse(storedNotifications);
      }
      
      // Se estiver autenticado, tente buscar da API
      if (isAuthenticated) {
        try {
          const response = await apiFetchNotifications();
          if (response && response.length > 0) {
            notificationsList = response;
            // Salvar no AsyncStorage para acesso offline
            await AsyncStorage.setItem('notifications', JSON.stringify(notificationsList));
          }
        } catch (apiError) {
          console.log('Erro ao buscar notificações da API, usando cache local', apiError);
        }
      }
      
      setNotifications(notificationsList);
      
      // Se estiver autenticado, buscar contagem de não lidas da API
      if (isAuthenticated) {
        try {
          const response = await api.get('/notifications/unread-count');
          if (response && response.count !== undefined) {
            setUnreadCount(response.count);
            // Atualizar badge do app
            await Notifications.setBadgeCountAsync(response.count);
          } else {
            // Fallback: calcular contagem localmente
            const unread = notificationsList.filter(notification => !notification.read).length;
            setUnreadCount(unread);
            await Notifications.setBadgeCountAsync(unread);
          }
        } catch (countError) {
          console.log('Erro ao buscar contagem de notificações não lidas', countError);
          // Fallback: calcular contagem localmente
          const unread = notificationsList.filter(notification => !notification.read).length;
          setUnreadCount(unread);
          await Notifications.setBadgeCountAsync(unread);
        }
      } else {
        // Sem autenticação, calcular contagem localmente
        const unread = notificationsList.filter(notification => !notification.read).length;
        setUnreadCount(unread);
        await Notifications.setBadgeCountAsync(unread);
      }
    } catch (err: any) {
      console.error('Erro ao buscar notificações:', err);
      setError(err.message || 'Erro ao buscar notificações');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Marcar notificação como lida
  const markAsRead = async (notificationId: string) => {
    try {
      if (isAuthenticated) {
        await apiMarkAsRead(notificationId);
      }
      
      // Atualizar estado local
      const updatedNotifications = notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      );
      
      setNotifications(updatedNotifications);
      
      // Atualizar contador de não lidas
      const newUnreadCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newUnreadCount);
      
      // Atualizar badge do app
      await Notifications.setBadgeCountAsync(newUnreadCount);
      
      // Salvar no AsyncStorage
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  // Marcar todas as notificações como lidas
  const markAllAsRead = async () => {
    try {
      if (isAuthenticated) {
        await apiMarkAllAsRead();
      }
      
      // Atualizar estado local
      const updatedNotifications = notifications.map(notification => 
        ({ ...notification, read: true })
      );
      
      setNotifications(updatedNotifications);
      setUnreadCount(0);
      
      // Atualizar badge do app
      await Notifications.setBadgeCountAsync(0);
      
      // Salvar no AsyncStorage
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    } catch (err) {
      console.error('Erro ao marcar todas notificações como lidas:', err);
    }
  };

  // Excluir uma notificação específica
  const deleteNotification = async (notificationId: string) => {
    try {
      // Chamar API para excluir no servidor
      if (isAuthenticated) {
        await api.del(`/notifications/${notificationId}`);
      }
      
      // Remover do estado local
      const wasUnread = notifications.find(n => n.id === notificationId && !n.read);
      const updatedNotifications = notifications.filter(n => n.id !== notificationId);
      setNotifications(updatedNotifications);
      
      // Atualizar contador se a notificação era não lida
      if (wasUnread) {
        const newUnreadCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newUnreadCount);
        await Notifications.setBadgeCountAsync(newUnreadCount);
      }
      
      // Atualizar armazenamento local
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      
      return true;
    } catch (err) {
      console.error('Erro ao excluir notificação:', err);
      return false;
    }
  };

  // Excluir todas as notificações
  const deleteAllNotifications = async () => {
    try {
      // Chamar API para excluir todas no servidor
      if (isAuthenticated) {
        await api.del('/notifications');
      }
      
      // Limpar estado local
      setNotifications([]);
      setUnreadCount(0);
      
      // Atualizar badge do app
      await Notifications.setBadgeCountAsync(0);
      
      // Limpar no AsyncStorage
      await AsyncStorage.setItem('notifications', JSON.stringify([]));
      
      return true;
    } catch (err) {
      console.error('Erro ao excluir todas as notificações:', err);
      return false;
    }
  };

  // Adicionar nova notificação (recebida em tempo real)
  const addNotification = async (notification: Notification) => {
    try {
      const updatedNotifications = [notification, ...notifications];
      setNotifications(updatedNotifications);
      
      // Atualizar contador de não lidas se a nova notificação não estiver lida
      if (!notification.read) {
        const newUnreadCount = unreadCount + 1;
        setUnreadCount(newUnreadCount);
        
        // Atualizar badge do app
        await Notifications.setBadgeCountAsync(newUnreadCount);
      }
      
      // Salvar no AsyncStorage
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    } catch (err) {
      console.error('Erro ao adicionar notificação:', err);
    }
  };

  // Limpar todas as notificações (apenas localmente)
  const clearAllNotifications = async () => {
    try {
      setNotifications([]);
      setUnreadCount(0);
      
      // Atualizar badge do app
      await Notifications.setBadgeCountAsync(0);
      
      // Limpar no AsyncStorage
      await AsyncStorage.setItem('notifications', JSON.stringify([]));
    } catch (err) {
      console.error('Erro ao limpar notificações:', err);
    }
  };

  // Função para solicitar permissão de notificações
  const requestNotificationPermission = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Permissão de notificações não concedida!');
        return false;
      }
      
      // Se a permissão foi concedida, registrar para notificações push
      if (isAuthenticated) {
        await registerForPushNotifications();
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissão de notificações:', error);
      return false;
    }
  };

  // Manipulador para novas mensagens recebidas via socket
  const handleNewMessage = useCallback((data: any) => {
    if (!data || !data.message) return;
    
    const newNotification: Notification = {
      id: data.message.id || Date.now().toString(),
      type: 'CHAT',
      title: 'Nova mensagem',
      message: `${data.message.senderName}: ${data.message.content}`,
      read: false,
      data: { chatRoomId: data.chatRoomId },
      createdAt: new Date().toISOString(),
    };
    
    addNotification(newNotification);
  }, [addNotification]);

  // Manipulador para alertas de pet perdido recebidos via socket
  const handleLostPetAlert = useCallback((data: any) => {
    if (!data || !data.alert) return;
    
    const newNotification: Notification = {
      id: Date.now().toString(),
      type: 'LOST_PET',
      title: 'Pet perdido próximo a você',
      message: `${data.alert.pet.name} foi reportado como perdido a ${Math.round(data.distance)}km de você.`,
      read: false,
      data: { alertId: data.alert.id },
      createdAt: new Date().toISOString(),
      image: data.alert.pet.primaryImage
    };
    
    addNotification(newNotification);
  }, [addNotification]);

  // Manipulador para alertas de pet encontrado recebidos via socket
  const handleFoundPetAlert = useCallback((data: any) => {
    if (!data || !data.alert) return;
    
    const newNotification: Notification = {
      id: Date.now().toString(),
      type: 'FOUND_PET',
      title: 'Pet encontrado próximo a você',
      message: `Um ${data.alert.species === 'DOG' ? 'cachorro' : 'gato'} foi encontrado a ${data.distance ? Math.round(data.distance) : '?'}km de você.`,
      read: false,
      data: { alertId: data.alert.id },
      createdAt: new Date().toISOString(),
      image: data.alert.image
    };
    
    addNotification(newNotification);
  }, [addNotification]);

  // Manipulador para notificações push recebidas quando o app está em primeiro plano
  const handlePushNotification = useCallback((notification: Notifications.Notification) => {
    const { data, title, body } = notification.request.content;
    
    if (!data || !data.type) return;
    
    // Verificar se é uma notificação de pet encontrado para tratamento prioritário
    const isPetFoundNotification = data.type === 'PET_FOUND';
    
    // Converter para formato de notificação interno
    const newNotification: Notification = {
      id: data.notificationId || notification.request.identifier || Date.now().toString(),
      type: data.type,
      title: title || 'Nova notificação',
      message: body || '',
      read: false,
      data,
      createdAt: new Date().toISOString(),
      image: data.imageUrl,
      priority: isPetFoundNotification ? 'high' : 'normal' // Marcar prioridade alta
    };
    
    // Para notificações de Pet Encontrado, mostrar um alerta especial
    if (isPetFoundNotification) {
      // Usar alerta nativo para garantir que o usuário veja mesmo que o app esteja em primeiro plano
      Alert.alert(
        '🚨 SEU PET FOI ENCONTRADO! 🚨',
        `${body}\n\nToque em "Ver detalhes" para entrar em contato imediatamente.`,
        [
          { 
            text: 'Ver detalhes', 
            onPress: () => {
              // Marcar como lida e navegar para a página específica
              markAsRead(newNotification.id);
              if (data.alertId) {
                router.push({
                  pathname: '/pet/lost-details/[id]',
                  params: { 
                    id: data.alertId,
                    showSightings: 'true',
                    highlight: data.sightingId
                  }
                });
              }
            },
            style: 'default'
          }
        ],
        { cancelable: false } // Impede que o usuário feche o alerta sem uma ação
      );
    }
    
    // Adicionar ao estado local apenas se não existir (para evitar duplicatas)
    // quando notificações forem persistentes
    const exists = notifications.some(n => n.id === newNotification.id);
    if (!exists) {
      addNotification(newNotification);
    }
    
    // Mesmo se a notificação já existir, atualizar a contagem não lidas
    fetchNotifications();
    
  }, [notifications, addNotification, fetchNotifications, markAsRead, router]);

  // Manipulador para quando o usuário toca em uma notificação push
  const handlePushNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    if (!data || !data.type) return;
    
    // Marcar notificação como lida
    if (data.notificationId) {
      markAsRead(data.notificationId);
    }
    
    // Navegar para a tela apropriada com base no tipo de notificação
    switch(data.type) {
      case 'CHAT':
        if (data.chatRoomId) {
          router.push(`/chat/${data.chatRoomId}`);
        }
        break;
      case 'LOST_PET':
        if (data.alertId) {
          router.push(`/pet/lost-details/${data.alertId}`);
        }
        break;
      case 'FOUND_PET':
        if (data.alertId) {
          router.push(`/pet/found-details/${data.alertId}`);
        }
        break;
      case 'LIKE':
      case 'COMMENT':
        if (data.postId) {
          router.push(`/post/${data.postId}`);
        }
        break;
      case 'FOLLOW':
        if (data.followerId || data.userData?.id || data.screenParams?.id) {
          // Priorizar campos em ordem de preferência
          const userId = data.followerId || data.userData?.id || data.screenParams?.id;
          console.log('Navegando para perfil de seguidor:', userId);
          router.push(`/profile/${userId}`);
        }
        break;
      case 'CLAIM':
        if (data.claimId) {
          router.push(`/claims/${data.claimId}`);
        }
        break;
    }
  }, [markAsRead, router]);

  // Configurar comunicação Socket.IO
  useEffect(() => {
    if (socket && isAuthenticated) {
      socket.on('new-message', handleNewMessage);
      socket.on('lost-pet-alert', handleLostPetAlert);
      socket.on('found-pet-alert', handleFoundPetAlert);
      
      return () => {
        socket.off('new-message');
        socket.off('lost-pet-alert');
        socket.off('found-pet-alert');
      };
    }
  }, [socket, isAuthenticated, handleNewMessage, handleLostPetAlert, handleFoundPetAlert]);

  // Configurar notificações push
  useEffect(() => {
    let notificationListeners: { removeListeners: () => void } | null = null;
    
    // Função para configurar notificações push
    const setupPushNotifications = async () => {
      if (isAuthenticated) {
        try {
          // Registrar para notificações push
          await registerForPushNotifications();
          
          // Configurar ouvintes para notificações push
          notificationListeners = setupNotificationListeners(
            handlePushNotification,
            handlePushNotificationResponse
          );
          
          // Verificar notificações que chegaram enquanto o app estava fechado
          const pendingNotifications = await checkPendingNotifications();
          
          // Processar cada notificação pendente
          if (pendingNotifications.length > 0) {
            console.log(`Encontradas ${pendingNotifications.length} notificações pendentes`);
            
            pendingNotifications.forEach(notification => {
              // Converter para o formato de notificação interna
              const internalNotification: Notification = {
                id: notification.id || Date.now().toString(),
                type: notification.type,
                title: notification.title,
                message: notification.message,
                read: false,
                data: notification.data || {},
                createdAt: notification.timestamp || new Date().toISOString(),
                image: notification.imageUrl
              };
              
              // Adicionar à lista de notificações (use setNotifications diretamente para evitar loops)
              setNotifications(prev => [internalNotification, ...prev]);
            });
          }
        } catch (error) {
          console.error("Erro ao configurar notificações push:", error);
        }
      } else {
        // Se não estiver autenticado, remover token de push
        try {
          await unregisterPushNotifications();
        } catch (error) {
          console.error("Erro ao remover token de push:", error);
        }
      }
    };
    
    setupPushNotifications();
    
    // Buscar notificações quando o componente for montado
    // Movemos para uma chamada separada para evitar loops e efeitos colaterais
    const loadInitialNotifications = async () => {
      try {
        await fetchNotifications();
      } catch (error) {
        console.error("Erro ao carregar notificações iniciais:", error);
      }
    };
    
    loadInitialNotifications();
    
    // Limpar ouvintes quando o componente for desmontado
    return () => {
      if (notificationListeners) {
        notificationListeners.removeListeners();
      }
    };
  }, [isAuthenticated, handlePushNotification, handlePushNotificationResponse]);
  // Nota: fetchNotifications e addNotification são excluídos da lista de dependências

  return { 
    notifications, 
    loading, 
    error, 
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    addNotification,
    clearAllNotifications,
    requestNotificationPermission
  };
};