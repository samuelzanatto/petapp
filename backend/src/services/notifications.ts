import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient, NotificationType } from '@prisma/client';
import { 
  sendPushNotification, 
  sendBulkPushNotifications,
  sendFullNotification,
  sendBulkFullNotifications,
  createNotification
} from '../controllers/notification.controller';

const prisma = new PrismaClient();

interface ConnectedUser {
  userId: string;
  socketId: string;
}

// Mapa de usuários conectados
const connectedUsers: Map<string, string[]> = new Map();

export const initializeSocketIO = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Em produção, limite para sua origem confiável
      methods: ['GET', 'POST']
    }
  });

  // Função para obter o ID do usuário de um socket
  function getUserIdFromSocket(socket: Socket): string | null {
    return (socket as any).userId || null;
  }

  // Função para obter todos os sockets de um usuário
  function getUserSockets(userId: string): Socket[] {
    const socketIds = connectedUsers.get(userId) || [];
    const sockets: Socket[] = [];

    // io precisa ser passado para esta função ou estar no escopo
    for (const socketId of socketIds) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        sockets.push(socket);
      }
    }

    return sockets;
  }

  // Middleware para autenticação
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Token de autenticação não fornecido'));
      }
      
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'default_secret'
      ) as { id: string };
      
      // Verificar se o usuário existe
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });
      
      if (!user) {
        return next(new Error('Usuário não encontrado'));
      }
      
      // Anexar o ID do usuário ao socket para uso posterior
      (socket as any).userId = decoded.id;
      
      next();
    } catch (error) {
      console.error('Erro na autenticação do socket:', error);
      next(new Error('Token de autenticação inválido'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`Usuário conectado: ${userId}`);
    
    // Registrar o usuário no mapa de conexões
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, []);
    }
    connectedUsers.get(userId)?.push(socket.id);
    
    // Entrar em salas de chat do usuário
    joinUserChatRooms(socket, userId);
    
    // Lidar com desconexão
    socket.on('disconnect', () => {
      console.log(`Usuário desconectado: ${userId}`);
      removeUserConnection(userId, socket.id);
    });
    
    // Lidar com entrar em uma sala de chat
    socket.on('join-chat-room', ({ chatRoomId }) => {
      socket.join(`chat:${chatRoomId}`);
    });
    
    // Lidar com sair de uma sala de chat
    socket.on('leave-chat-room', ({ chatRoomId }) => {
      socket.leave(`chat:${chatRoomId}`);
    });
    
    // Lidar com mensagens de chat
    socket.on('chat-message', async ({ chatRoomId, content }) => {
      try {
        // Obter o ID do usuário do socket
        const userId = getUserIdFromSocket(socket);
        
        if (!userId) {
          return socket.emit('error', { message: 'Não autorizado' });
        }
        
        // Salvar mensagem no banco de dados
        const message = await prisma.message.create({
          data: {
            content,
            senderId: userId,
            chatRoomId
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            }
          }
        });
        
        // Enviar mensagem para todos na sala
        io.to(`chat:${chatRoomId}`).emit('new-chat-message', message);
          
        // Encontrar o outro usuário na sala para notificação
        const chatRoom = await prisma.chatRoom.findUnique({
          where: { id: chatRoomId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            },
            founder: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            },
            lostPetAlert: {
              include: {
                pet: {
                  select: {
                    name: true,
                    primaryImage: true
                  }
                }
              }
            },
            foundPetAlert: true
          }
        });
        
        if (chatRoom) {
          const otherUserId = userId === chatRoom.userId ? chatRoom.founderId : chatRoom.userId;
          const otherUser = userId === chatRoom.userId ? chatRoom.founder : chatRoom.user;
          const sender = userId === chatRoom.userId ? chatRoom.user : chatRoom.founder;
          
          // Verificar se o usuário está online (tem sockets conectados)
          const isUserOnline = connectedUsers.has(otherUserId) && getUserSockets(otherUserId).some(
            s => s.rooms.has(`chat:${chatRoomId}`)
          );
          
          // Se não estiver online ou não estiver na sala, enviar notificação
          if (!isUserOnline) {
            // Enviar notificação em tempo real para usuário conectado
            notifyUser(io, otherUserId, 'new-message', {
              chatRoomId,
              message: {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                senderName: sender.name
              }
            });
            
            // Determinar o texto da notificação e imagem
            let contextText = '';
            let imageUrl = sender.profileImage || undefined;
            
            if (chatRoom.lostPetAlert) {
              contextText = ` sobre ${chatRoom.lostPetAlert.pet.name}`;
              imageUrl = chatRoom.lostPetAlert.pet.primaryImage || imageUrl;
            } else if (chatRoom.foundPetAlert) {
              contextText = ' sobre o pet encontrado';
              imageUrl = chatRoom.foundPetAlert.image || imageUrl;
            }
              // Criar uma notificação persistente no banco de dados e enviar push
            await sendFullNotification({
              userId: otherUserId,
              type: NotificationType.CHAT,
              title: 'Nova mensagem',
              message: `${sender.name}${contextText}: ${content.length > 40 ? content.substring(0, 40) + '...' : content}`,
              data: {
                chatRoomId,
                messageId: message.id,
                senderId: userId,
                type: 'CHAT', // Adicionar explicitamente o tipo para FCM
                notificationType: 'CHAT', // Campo adicional para garantir compatibilidade
                title: 'Nova mensagem', // Duplicar para FCM
                body: `${sender.name}${contextText}: ${content.length > 40 ? content.substring(0, 40) + '...' : content}`, // Duplicar para FCM
                priority: 'high',
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                // Adicionar informações para agrupamento
                sender_name: sender.name,
                thread_id: `chat_${chatRoomId}`, // ID do grupo de mensagens
                group_key: `chat_${chatRoomId}`, // Para Android
                group_id: `chat_${chatRoomId}`, // Alternativa para Android
                category: 'CHAT', // Para iOS
                collapse_key: `chat_${chatRoomId}` // Para FCM
              },
              imageUrl,
              senderId: userId
            });
          }
        }
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        socket.emit('error', { message: 'Erro ao enviar mensagem' });
      }
    });

    socket.on('typing-status', ({ chatRoomId, isTyping }) => {
      try {
        const userId = getUserIdFromSocket(socket);
        
        if (!userId) {
          return socket.emit('error', { message: 'Não autorizado' });
        }
        
        // Enviar status de digitação para todos na sala
        io.to(`chat:${chatRoomId}`).emit('typing-status', { 
          userId, 
          isTyping 
        });
      } catch (error) {
        console.error('Erro ao processar status de digitação:', error);
      }
    });
    
    // Lidar com notificações de alerta de pet perdido
    socket.on('lost-pet-alert', async (data: { petId: string, latitude: number, longitude: number }) => {
      try {
        // A lógica de criação do alerta já está no controller, mas aqui podemos
        // notificar usuários próximos em tempo real
        
        // Encontrar usuários próximos (baseado em distância)
        const { petId, latitude, longitude } = data;
        
        // Buscar informações do pet
        const pet = await prisma.pet.findUnique({
          where: { id: petId },
          include: {
            owner: true
          }
        });
        
        if (!pet || pet.ownerId !== userId) {
          socket.emit('error', { message: 'Pet não encontrado ou não pertence a você' });
          return;
        }
        
        // Criar o alerta no banco de dados
        const alert = await prisma.lostPetAlert.create({
          data: {
            petId,
            userId,
            latitude,
            longitude,
            status: "ACTIVE",
          },
          include: {
            pet: true,
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            }
          }
        });
        
        // Buscar usuários próximos para notificar
        const nearbyUsers = await findNearbyUsers(latitude, longitude, 10, userId);
        
        if (nearbyUsers.length > 0) {
          // Criar e enviar notificações completas (persistentes + push) para todos os usuários próximos
          await sendBulkFullNotifications({
            userIds: nearbyUsers.map(user => user.id),
            type: NotificationType.LOST_PET,
            title: 'Pet perdido próximo a você',
            message: `${pet.name} foi reportado como perdido próximo à sua localização.`,
            data: {
              alertId: alert.id,
              petId: pet.id,
              petName: pet.name,
              type: 'LOST_PET', // Adicionando tipo explícito para FCM
              notificationType: 'LOST_PET',
              title: 'Pet perdido próximo a você', // Duplicando para FCM
              body: `${pet.name} foi reportado como perdido próximo à sua localização.`, // Duplicando para FCM
              priority: 'high',
              click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            imageUrl: pet.primaryImage || undefined,
            senderId: userId
          });
        }
        
        // Confirmar para o emissor
        socket.emit('lost-pet-alert-confirmed', {
          alert,
          notifiedUsers: nearbyUsers.length
        });
      } catch (error) {
        console.error('Erro ao processar alerta de pet perdido:', error);
        socket.emit('error', { message: 'Erro ao emitir alerta de pet perdido' });
      }
    });
    
    // Novo evento para notificações de pet encontrado
    socket.on('found-pet-alert', async (data: { alertId: string, latitude: number, longitude: number }) => {
      try {
        const userId = getUserIdFromSocket(socket);
        if (!userId) {
          return socket.emit('error', { message: 'Não autorizado' });
        }
        
        const { alertId, latitude, longitude } = data;
        
        // Buscar detalhes do alerta
        const alert = await prisma.foundPetAlert.findUnique({
          where: { id: alertId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        });
        
        if (!alert) {
          return socket.emit('error', { message: 'Alerta não encontrado' });
        }
        
        // Buscar alertas de pets perdidos com a mesma espécie
        const lostPets = await prisma.lostPetAlert.findMany({
          where: {
            status: "ACTIVE",
            pet: {
              species: alert.species
            }
          },
          include: {
            pet: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
        
        // Filtrar por raio (10km)
        const nearbyLostPets = lostPets.filter(lostPet => {
          if (!lostPet.latitude || !lostPet.longitude) return false;
          
          const distance = calculateDistance(
            latitude,
            longitude,
            lostPet.latitude,
            lostPet.longitude
          );
          
          return distance <= 10; // 10km raio
        });
        
        // Notificar donos de pets perdidos
        const userIdsToNotify = nearbyLostPets.map(lostPet => lostPet.userId);
        const uniqueUserIds = [...new Set(userIdsToNotify)];
        
        if (uniqueUserIds.length > 0) {
          // Criar e enviar notificações completas (persistentes + push) para todos os donos de pets perdidos
          await sendBulkFullNotifications({
            userIds: uniqueUserIds,
            type: NotificationType.FOUND_PET,
            title: 'Pet encontrado próximo à área de busca',
            message: `Um ${alert.species === 'DOG' ? 'cachorro' : 'gato'} foi encontrado por ${alert.user.name} próximo à área onde você perdeu seu pet.`,
            data: {
              alertId: alert.id,
              species: alert.species,
              type: 'FOUND_PET', // Adicionando tipo explícito para FCM
              notificationType: 'FOUND_PET',
              title: 'Pet encontrado próximo à área de busca', // Duplicar para FCM
              body: `Um ${alert.species === 'DOG' ? 'cachorro' : 'gato'} foi encontrado por ${alert.user.name} próximo à área onde você perdeu seu pet.`, // Duplicar para FCM
              priority: 'high',
              click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            imageUrl: alert.image || undefined,
            senderId: userId
          });
        }
        
        // Confirmar para o emissor
        socket.emit('found-pet-alert-confirmed', {
          alert,
          potentialMatches: uniqueUserIds.length
        });
        
      } catch (error) {
        console.error('Erro ao processar alerta de pet encontrado:', error);
        socket.emit('error', { message: 'Erro ao emitir alerta de pet encontrado' });
      }
    });
  });

  return io;
};

// Função para encontrar usuários próximos
async function findNearbyUsers(latitude: number, longitude: number, radiusKm: number, excludeUserId: string) {
  // Buscar todos os usuários com localização registrada
  const users = await prisma.user.findMany({
    where: {
      id: { not: excludeUserId },
      latitude: { not: null },
      longitude: { not: null }
    }
  });
  
  // Filtrar por distância
  const nearbyUsers = users
    .map(user => {
      const distance = calculateDistance(
        latitude,
        longitude,
        user.latitude as number,
        user.longitude as number
      );
      return { ...user, distance };
    })
    .filter(user => user.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
  
  return nearbyUsers;
}

// Função para calcular distância entre coordenadas (fórmula de Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Notificar um usuário específico
function notifyUser(io: Server, userId: string, event: string, data: any) {
  const socketIds = connectedUsers.get(userId);
  if (socketIds && socketIds.length > 0) {
    socketIds.forEach(socketId => {
      io.to(socketId).emit(event, data);
    });
  }
}

// Remover uma conexão de socket quando um usuário desconecta
function removeUserConnection(userId: string, socketId: string) {
  const socketIds = connectedUsers.get(userId);
  if (socketIds) {
    const updatedSocketIds = socketIds.filter(id => id !== socketId);
    if (updatedSocketIds.length > 0) {
      connectedUsers.set(userId, updatedSocketIds);
    } else {
      connectedUsers.delete(userId);
    }
  }
}

// Fazer um usuário entrar em todas as suas salas de chat
async function joinUserChatRooms(socket: Socket, userId: string) {
  try {
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        OR: [
          { userId },
          { founderId: userId }
        ]
      }
    });
    
    for (const room of chatRooms) {
      socket.join(`chat:${room.id}`);
    }
  } catch (error) {
    console.error('Erro ao entrar nas salas de chat:', error);
  }
}

// Exportar funções utilitárias para uso em outros lugares 
export {
  findNearbyUsers,
  calculateDistance,
  notifyUser
};