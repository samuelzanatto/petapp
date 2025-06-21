import { Request, Response } from 'express';
import { PrismaClient, NotificationType } from '@prisma/client';
import axios from 'axios';
import { config } from '../config';

const prisma = new PrismaClient();

// Função para registrar token do dispositivo
export const registerDeviceToken = async (req: Request, res: Response) => {
  try {
    const { token, deviceId, platform } = req.body;
    const userId = req.userId;

    if (!token) {
      return res.status(400).json({ message: 'Token de dispositivo é obrigatório' });
    }

    // Verificar se o token já existe
    const existingToken = await prisma.deviceToken.findUnique({
      where: { token }
    });

    if (existingToken) {
      // Atualizar o token existente se o user_id for diferente
      if (existingToken.userId !== userId) {
        await prisma.deviceToken.update({
          where: { id: existingToken.id },
          data: { 
            userId: userId as string,
            deviceId,
            platform: platform || existingToken.platform,
            updatedAt: new Date()
          }
        });
      }
      return res.status(200).json({ message: 'Token atualizado com sucesso' });
    }

    // Criar novo token
    const newToken = await prisma.deviceToken.create({
      data: {
        token,
        userId: userId as string,
        deviceId,
        platform: platform || 'unknown',
      }
    });

    res.status(201).json({ 
      message: 'Token registrado com sucesso',
      data: newToken 
    });
  } catch (error) {
    console.error('Erro ao registrar token de dispositivo:', error);
    res.status(500).json({ message: 'Erro ao registrar token de dispositivo' });
  }
};

// Função para remover token do dispositivo (logout)
export const removeDeviceToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const userId = req.userId;

    if (!token) {
      return res.status(400).json({ message: 'Token de dispositivo é obrigatório' });
    }

    // Verificar e remover o token
    await prisma.deviceToken.deleteMany({
      where: { 
        token,
        userId: userId as string
      }
    });

    res.status(200).json({ message: 'Token removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover token de dispositivo:', error);
    res.status(500).json({ message: 'Erro ao remover token de dispositivo' });
  }
};

// Buscar notificações do usuário
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Buscar notificações do usuário no banco de dados
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: userId as string },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          }
        }
      }),
      prisma.notification.count({
        where: { userId: userId as string }
      })
    ]);

    res.status(200).json({
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ message: 'Erro ao buscar notificações' });
  }
};

// Função para contar notificações não lidas
export const countUnreadNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    const count = await prisma.notification.count({
      where: { 
        userId: userId as string,
        read: false
      }
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error('Erro ao contar notificações não lidas:', error);
    res.status(500).json({ message: 'Erro ao contar notificações não lidas' });
  }
};

// Marcar notificação como lida
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Verificar se a notificação pertence ao usuário
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: userId as string
      }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }

    // Marcar como lida
    await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    res.status(200).json({ message: 'Notificação marcada como lida' });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ message: 'Erro ao marcar notificação como lida' });
  }
};

// Marcar todas as notificações como lidas
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    // Marcar todas as notificações do usuário como lidas
    await prisma.notification.updateMany({
      where: { 
        userId: userId as string,
        read: false
      },
      data: { read: true }
    });

    res.status(200).json({ message: 'Todas as notificações foram marcadas como lidas' });
  } catch (error) {
    console.error('Erro ao marcar todas notificações como lidas:', error);
    res.status(500).json({ message: 'Erro ao marcar todas notificações como lidas' });
  }
};

// Excluir uma notificação específica
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Verificar se a notificação pertence ao usuário
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: userId as string
      }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }

    // Excluir a notificação
    await prisma.notification.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Notificação excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir notificação:', error);
    res.status(500).json({ message: 'Erro ao excluir notificação' });
  }
};

// Excluir todas as notificações do usuário
export const deleteAllNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    // Excluir todas as notificações do usuário
    await prisma.notification.deleteMany({
      where: { userId: userId as string }
    });

    res.status(200).json({ message: 'Todas as notificações foram excluídas' });
  } catch (error) {
    console.error('Erro ao excluir todas as notificações:', error);
    res.status(500).json({ message: 'Erro ao excluir todas as notificações' });
  }
};

// Função para criar uma notificação no banco de dados
export const createNotification = async (params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  imageUrl?: string;
  senderId?: string;
}): Promise<any> => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data || {},
        imageUrl: params.imageUrl,
        senderId: params.senderId,
      }
    });
    
    return notification;
  } catch (error) {
    console.error('Erro ao criar notificação no banco de dados:', error);
    throw error;
  }
};

// Enviar notificação push para um usuário específico
export const sendPushNotification = async (userId: string, title: string, body: string, data: any = {}) => {
  try {
    // Importar o serviço Firebase Admin
    const { sendFcmMessage } = require('../services/firebaseAdmin');
    
    // Buscar tokens do usuário
    const deviceTokens = await prisma.deviceToken.findMany({
      where: { userId }
    });

    if (deviceTokens.length === 0) {
      console.log(`Nenhum token encontrado para o usuário ${userId}`);
      return;
    }

    // Separar tokens por plataforma para permitir personalização
    const expoTokens: string[] = [];
    const fcmTokens: string[] = [];

    deviceTokens.forEach(dt => {
      // Os tokens FCM geralmente começam com 'f' ou são mais longos
      if (dt.token.startsWith('ExponentPushToken[')) {
        expoTokens.push(dt.token);
      } else {
        fcmTokens.push(dt.token);
      }
    });
    
    console.log(`Enviando para ${expoTokens.length} tokens Expo e ${fcmTokens.length} tokens FCM`);

    // Preparar resultados de envio
    const results = [];
    
    // Enviar para tokens Expo (se houver)
    if (expoTokens.length > 0) {
      // Configurar mensagem no formato do Expo
      const expoMessage = {
        to: expoTokens,
        title,
        body,
        data: {
          ...data,
          date: new Date().toISOString()
        },
        sound: 'default',
        badge: 1,
        priority: 'high', // Alta prioridade para garantir entrega
        channelId: 'default', // Canal padrão para Android
      };

      // Log para debug
      console.log(`Enviando notificação push (Expo) para o usuário ${userId}:`, expoMessage);

      // Implementação do envio usando Expo Notifications Server (API)
      try {
        const response = await axios.post('https://exp.host/--/api/v2/push/send', expoMessage, {
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Notificação Expo enviada com sucesso:', response.data);
        results.push(response.data);
      } catch (error) {
        console.error('Erro ao enviar notificação Expo:', error);
      }
    }

    // Enviar para tokens FCM usando a nova API v1 (se houver)
    if (fcmTokens.length > 0) {
      try {
        // Processar cada token individualmente
        for (const token of fcmTokens) {          // Criar mensagem no formato da API FCM v1
          const fcmMessage = {
            token: token,
            notification: {
              title,
              body,
            },
            data: Object.fromEntries(
              Object.entries({
                ...data,
                title,
                body,
                date: new Date().toISOString(),
                notificationType: data.type || 'DEFAULT'
              }).map(([k, v]) => [k, String(v)])
            ),
            android: {
              priority: 'HIGH',
              notification: {
                icon: 'notification_icon',
                color: '#FF6B6B',
                sound: 'default',
                channel_id: data.type === 'CHAT' ? 'chat_channel' : 'high_importance_channel',
                // Adicionar suporte para agrupamento nas notificações
                tag: data.thread_id, // Identificador para agrupar notificações
                // Se for 'CHAT', usar ID específico de grupo de notificações
                notification_count: 0, // Será gerenciado pelo sistema Android
              }
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                  'content-available': 1,
                  'mutable-content': 1,
                  // Agrupamento para iOS
                  'thread-id': data.thread_id, // Agrupar por conversas
                  alert: {
                    title,
                    body
                  }
                }
              },
              headers: {
                'apns-priority': '10',
                'apns-push-type': 'alert',
                'apns-topic': 'com.samukka_64.mobile'
              }
            }
          };

          console.log('Enviando notificação FCM usando API v1:', token);
          
          // Enviar usando o novo serviço FCM v1
          const response = await sendFcmMessage(fcmMessage);
          console.log('Notificação FCM v1 enviada com sucesso:', response);
          results.push(response);
        }
      } catch (fcmError: any) {
        console.error('Erro ao enviar notificação FCM:', fcmError);
        // Verificar se o erro é devido a um token não registrado ou inválido
        if (
          fcmError.response &&
          fcmError.response.data &&
          fcmError.response.data.error &&
          (fcmError.response.data.error.status === 'NOT_FOUND' ||
           (fcmError.response.data.error.details && 
            fcmError.response.data.error.details[0] &&
            fcmError.response.data.error.details[0].errorCode === 'UNREGISTERED'))
        ) {
          // O token que causou o erro está em fcmError.config.data se a iteração parou nele,
          // ou o último token tentado se o erro foi capturado após o loop.
          // Para ser seguro, vamos assumir que o erro está relacionado ao 'token' que estava sendo processado
          // quando o erro ocorreu. No entanto, a chamada é `sendFcmMessage(fcmMessage)` e fcmMessage contém o token.
          // Precisamos extrair o token da mensagem que falhou.
          // A mensagem original está em fcmError.config.data (string JSON)
          let failedToken: string | null = null;
          if (fcmError.config && fcmError.config.data) {
            try {
              const requestBody = JSON.parse(fcmError.config.data);
              if (requestBody && requestBody.message && requestBody.message.token) {
                failedToken = requestBody.message.token;
              }
            } catch (parseError) {
              console.error('Erro ao parsear config.data para extrair token:', parseError);
            }
          }

          if (failedToken) {
            console.log(`Token FCM não registrado ou inválido detectado: ${failedToken}. Removendo do banco de dados.`);
            try {
              await prisma.deviceToken.deleteMany({
                where: { token: failedToken }
              });
              console.log(`Token ${failedToken} removido com sucesso.`);
            } catch (deleteError) {
              console.error(`Erro ao remover token ${failedToken} do banco de dados:`, deleteError);
            }
          } else {
            console.warn('Não foi possível identificar o token FCM inválido para remoção.');
          }
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Erro ao processar envio de notificação push:', error);
    throw error;
  }
};

// Enviar notificações em massa para vários usuários
export const sendBulkPushNotifications = async (userIds: string[], title: string, body: string, data: any = {}) => {
  try {
    // Buscar todos os tokens dos usuários
    const deviceTokens = await prisma.deviceToken.findMany({
      where: {
        userId: {
          in: userIds
        }
      }
    });

    if (deviceTokens.length === 0) {
      console.log('Nenhum token encontrado para os usuários especificados');
      return;
    }

    // Separar tokens por plataforma para permitir personalização
    const expoTokens: string[] = [];
    const fcmTokens: string[] = [];

    deviceTokens.forEach(dt => {
      // Os tokens Expo têm formato específico
      if (dt.token.startsWith('ExponentPushToken[')) {
        expoTokens.push(dt.token);
      } else {
        fcmTokens.push(dt.token);
      }
    });
    
    console.log(`Enviando notificações em massa para ${expoTokens.length} tokens Expo e ${fcmTokens.length} tokens FCM`);

    // Resultados das operações de envio
    const results = [];
    
    // Enviar para tokens Expo em chunks (se houver)
    if (expoTokens.length > 0) {
      const chunkSize = 100; // Limite da API Expo
      for (let i = 0; i < expoTokens.length; i += chunkSize) {
        const chunkTokens = expoTokens.slice(i, i + chunkSize);
        
        // Configurar mensagem no formato Expo
        const expoMessage = {
          to: chunkTokens,
          title,
          body,
          data: {
            ...data,
            title,
            body,
            date: new Date().toISOString(),
            notificationType: data.type || 'DEFAULT',
            priority: 'high',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          sound: 'default',
          badge: 1,
          priority: 'high',
          channelId: data.type === 'CHAT' ? 'chat' : 'high_importance_channel',
        };

        try {
          const response = await axios.post('https://exp.host/--/api/v2/push/send', expoMessage, {
            headers: {
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
          });
          
          results.push(response.data);
        } catch (error) {
          console.error('Erro ao enviar notificações Expo em massa:', error);
        }
      }
    }

    // Enviar para tokens FCM em chunks (se houver)
    if (fcmTokens.length > 0) {
      const chunkSize = 500; // FCM suporta até 500 tokens por requisição
      for (let i = 0; i < fcmTokens.length; i += chunkSize) {
        const chunkTokens = fcmTokens.slice(i, i + chunkSize);
          // Formato específico para FCM que funciona melhor com apps em background
        const fcmMessage = {
          registration_ids: chunkTokens,
          notification: {
            title,
            body,
            sound: 'default',
            badge: '1',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            icon: 'notification_icon',
            android_channel_id: data.type === 'CHAT' ? 'chat' : 'high_importance_channel',
          },
          data: {
            ...data,
            title, // Duplicar no data para garantir
            body,  // Duplicar no data para garantir
            date: new Date().toISOString(),
            notificationType: data.type || 'DEFAULT',
            type: data.type || 'DEFAULT', // Adicionar campo explícito de tipo
            priority: 'high',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
          priority: 'high',
          content_available: true,
          android: {
            priority: 'high',
            notification: {
              icon: 'notification_icon',
              color: '#FF6B6B',
              sound: 'default',
              channel_id: data.type === 'CHAT' ? 'chat' : 'high_importance_channel',
              priority: 'high',
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                'content-available': 1, // Modificado para usar formato correto
                'mutable-content': 1, // Permite que o iOS modifique o conteúdo (para imagens)
              }
            },
            headers: {
              'apns-priority': '10',
              'apns-push-type': 'alert', // Modificado para 'alert' quando há title/body
              'apns-topic': 'com.samukka_64.mobile' // Adicionar o bundle ID do app
            }
          }
        };

        try {
          // Enviar via FCM API
          const fcmApiKey = config.firebase.serverKey;
          if (!fcmApiKey) {
            console.error('Chave do servidor FCM não configurada');
            continue;
          }

          const fcmResponse = await axios.post(
            'https://fcm.googleapis.com/fcm/send',
            fcmMessage,
            {
              headers: {
                'Authorization': `key=${fcmApiKey}`,
                'Content-Type': 'application/json',
              },
            }
          );
          
          console.log(`FCM: Enviadas ${chunkTokens.length} notificações em massa`);
          results.push(fcmResponse.data);
        } catch (fcmError) {
          console.error('Erro ao enviar notificações FCM em massa:', fcmError);
        }
      }
    }
    
    return { 
      message: `Notificações enviadas com sucesso para ${userIds.length} usuários`,
      results
    };
  } catch (error) {
    console.error('Erro ao processar envio de notificações push em massa:', error);
    throw error;
  }
};

// Enviar notificação completa (banco de dados + push) para um usuário
export const sendFullNotification = async (params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  imageUrl?: string;
  senderId?: string;
}): Promise<any> => {
  try {
    // 1. Criar notificação no banco de dados
    const notification = await createNotification(params);
    
    // 2. Enviar notificação push
    await sendPushNotification(
      params.userId, 
      params.title, 
      params.message, 
      {
        ...params.data,
        notificationId: notification.id,
        type: params.type
      }
    );
    
    return notification;
  } catch (error) {
    console.error('Erro ao enviar notificação completa:', error);
    throw error;
  }
};

// Enviar notificações completas em massa para vários usuários
export const sendBulkFullNotifications = async (params: {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  imageUrl?: string;
  senderId?: string;
}): Promise<any> => {
  try {
    // 1. Criar notificações no banco de dados para cada usuário
    const notificationPromises = params.userIds.map(userId => 
      createNotification({
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data,
        imageUrl: params.imageUrl,
        senderId: params.senderId
      })
    );
    
    const notifications = await Promise.all(notificationPromises);
    
    // 2. Enviar notificações push em massa
    await sendBulkPushNotifications(
      params.userIds,
      params.title,
      params.message,
      {
        ...params.data,
        type: params.type
      }
    );
    
    return notifications;
  } catch (error) {
    console.error('Erro ao enviar notificações completas em massa:', error);
    throw error;
  }
};