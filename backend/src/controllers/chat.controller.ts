import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createChatRoom = async (req: Request, res: Response) => {
  try {
    const { foundPetAlertId } = req.body;
    const userId = req.userId;

    // Verificar se o alerta de pet encontrado existe
    const foundPetAlert = await prisma.foundPetAlert.findUnique({
      where: { id: foundPetAlertId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!foundPetAlert) {
      return res.status(404).json({ message: 'Alerta de pet encontrado não existe' });
    }

    // Verificar se o usuário é o tutor de um pet perdido
    // que pode corresponder ao pet encontrado
    const userLostPets = await prisma.lostPetAlert.findMany({
      where: {
        userId: userId as string,
        status: "ACTIVE",
        pet: {
          species: foundPetAlert.species
        }
      },
      include: {
        pet: true
      }
    });

    if (userLostPets.length === 0) {
      return res.status(403).json({ 
        message: 'Você não tem pets perdidos que possam corresponder a este alerta' 
      });
    }

    // PRIMEIRO verificar se já existe QUALQUER sala de chat entre os usuários
    const existingChatBetweenUsers = await prisma.chatRoom.findFirst({
      where: {
        OR: [
          {
            userId: userId as string,
            founderId: foundPetAlert.userId
          },
          {
            userId: foundPetAlert.userId,
            founderId: userId as string
          }
        ]
      }
    });

    if (existingChatBetweenUsers) {
      return res.status(200).json({
        chatRoom: existingChatBetweenUsers,
        message: 'Sala de chat já existe entre os usuários'
      });
    }

    // Se não existe chat entre os usuários, ENTÃO verificar se existe uma sala 
    // especificamente para este alerta
    const existingChatRoom = await prisma.chatRoom.findFirst({
      where: {
        foundPetAlertId,
        userId: userId as string
      }
    });

    if (existingChatRoom) {
      return res.status(200).json({ 
        chatRoom: existingChatRoom,
        message: 'Sala de chat já existe'
      });
    }

    // Criar uma sala de chat
    const chatRoom = await prisma.chatRoom.create({
      data: {
        userId: userId as string,
        founderId: foundPetAlert.userId,
        foundPetAlertId,
        // Associar com o primeiro pet perdido que corresponde (poderia ser melhorado)
        lostPetAlertId: userLostPets[0].id
      },
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
        foundPetAlert: true,
        lostPetAlert: {
          include: {
            pet: true
          }
        }
      }
    });

    res.status(201).json(chatRoom);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar sala de chat' });
  }
};

export const getUserChatRooms = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    // Buscar todas as salas de chat do usuário
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        OR: [
          { userId: userId as string },
          { founderId: userId as string }
        ]
      },
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
        foundPetAlert: true,
        lostPetAlert: {
          include: {
            pet: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Filtrar chats diretos (sem alertas) que não possuem reivindicações aprovadas
    const validChatRooms = await Promise.all(
      chatRooms.map(async room => {
        // Se tiver alertas associados, sempre incluir na lista
        if (room.foundPetAlertId || room.lostPetAlertId) {
          return room;
        }

        // Para chats diretos, verificar se existe reivindicação aprovada
        const otherUserId = room.userId === userId ? room.founderId : room.userId;
        const approvedClaim = await prisma.petClaim.findFirst({
          where: {
            OR: [
              // Caso 1: Usuário atual criou o alerta e o outro fez a reivindicação
              {
                status: 'APPROVED',
                OR: [
                  {
                    foundAlert: {
                      userId: userId as string
                    },
                    claimantId: otherUserId
                  },
                  {
                    lostAlert: {
                      userId: userId as string
                    },
                    claimantId: otherUserId
                  }
                ]
              },
              // Caso 2: Outro usuário criou o alerta e o atual fez a reivindicação
              {
                status: 'APPROVED',
                OR: [
                  {
                    foundAlert: {
                      userId: otherUserId
                    },
                    claimantId: userId as string
                  },
                  {
                    lostAlert: {
                      userId: otherUserId
                    },
                    claimantId: userId as string
                  }
                ]
              }
            ]
          }
        });

        return approvedClaim ? room : null;
      })
    );

    // Remover nulos (chats que não possuem reivindicações aprovadas)
    const filteredChatRooms = validChatRooms.filter(room => room !== null);

    // Formatar para melhor usabilidade no frontend
    const formattedChatRooms = filteredChatRooms.map(room => {
      const otherUser = room.userId === userId 
        ? room.founder 
        : room.user;
      
      return {
        id: room.id,
        otherUser,
        foundPetAlert: room.foundPetAlert,
        lostPetAlert: room.lostPetAlert,
        lastMessage: room.messages[0] || null,
        updatedAt: room.updatedAt
      };
    });

    res.status(200).json(formattedChatRooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar salas de chat' });
  }
};

export const getChatRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id },
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
        foundPetAlert: true,
        lostPetAlert: {
          include: {
            pet: true
          }
        }
      }
    });

    if (!chatRoom) {
      return res.status(404).json({ message: 'Sala de chat não encontrada' });
    }

    // Verificar se o usuário é participante do chat
    if (chatRoom.userId !== userId && chatRoom.founderId !== userId) {
      return res.status(403).json({ message: 'Você não tem permissão para acessar esta sala de chat' });
    }

    // Identificar o outro usuário na conversa
    const otherUserId = chatRoom.userId === userId ? chatRoom.founderId : chatRoom.userId;
    
    // Verificar se existe reivindicação aprovada entre os usuários
    // Essa verificação é necessária apenas para chats diretos (sem alertas associados)
    if (!chatRoom.foundPetAlertId && !chatRoom.lostPetAlertId) {      const approvedClaim = await prisma.petClaim.findFirst({
        where: {
          OR: [
            // Caso 1: Usuário atual criou o alerta e o outro fez a reivindicação
            {
              status: 'APPROVED',
              OR: [
                {
                  foundAlert: {
                    userId: userId as string
                  },
                  claimantId: otherUserId
                },
                {
                  lostAlert: {
                    userId: userId as string
                  },
                  claimantId: otherUserId
                }
              ]
            },
            // Caso 2: Outro usuário criou o alerta e o atual fez a reivindicação
            {
              status: 'APPROVED',
              OR: [
                {
                  foundAlert: {
                    userId: otherUserId
                  },
                  claimantId: userId as string
                },
                {
                  lostAlert: {
                    userId: otherUserId
                  },
                  claimantId: userId as string
                }
              ]
            }
          ]
        }
      });
      
      if (!approvedClaim) {
        return res.status(403).json({ 
          message: 'Você só pode acessar o chat com este usuário se existir uma reivindicação aprovada entre vocês'
        });
      }
    }

    // Buscar mensagens
    const messages = await prisma.message.findMany({
      where: {
        chatRoomId: id
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Formatar para melhor usabilidade no frontend
    const otherUser = chatRoom.userId === userId 
      ? chatRoom.founder 
      : chatRoom.user;
    
    const formattedChatRoom = {
      id: chatRoom.id,
      otherUser,
      foundPetAlert: chatRoom.foundPetAlert,
      lostPetAlert: chatRoom.lostPetAlert,
      messages
    };

    res.status(200).json(formattedChatRoom);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar sala de chat' });
  }
};

export const createOrGetDirectChat = async (req: Request, res: Response) => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.userId;
    
    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: 'Não é possível criar um chat consigo mesmo' });
    }
    
    // Verificar se o usuário alvo existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });
    
    if (!targetUser) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
      // NOVA LÓGICA: Verificar se existe uma reivindicação aprovada entre os usuários
    // Verificar se o usuário atual tem uma reivindicação aprovada feita pelo usuário alvo
    const approvedClaim = await prisma.petClaim.findFirst({
      where: {
        OR: [
          // Caso 1: Usuário atual criou o alerta e o alvo fez a reivindicação
          {
            status: 'APPROVED',
            OR: [
              {
                foundAlert: {
                  userId: currentUserId as string
                },
                claimantId: targetUserId
              },
              {
                lostAlert: {
                  userId: currentUserId as string
                },
                claimantId: targetUserId
              }
            ]
          },
          // Caso 2: Usuário alvo criou o alerta e o atual fez a reivindicação
          {
            status: 'APPROVED',
            OR: [
              {
                foundAlert: {
                  userId: targetUserId
                },
                claimantId: currentUserId as string
              },
              {
                lostAlert: {
                  userId: targetUserId
                },
                claimantId: currentUserId as string
              }
            ]
          }
        ]
      }
    });
    
    if (!approvedClaim) {
      return res.status(403).json({ 
        message: 'Você só pode iniciar um chat com este usuário se existir uma reivindicação aprovada entre vocês' 
      });
    }
    
    // Verificar se já existe QUALQUER chat entre os usuários, independente do tipo
    // (direto ou associado a alertas/reivindicações)
    const existingChatRoom = await prisma.chatRoom.findFirst({
      where: {
        OR: [
          { 
            userId: currentUserId as string,
            founderId: targetUserId 
          },
          { 
            userId: targetUserId,
            founderId: currentUserId as string 
          }
        ]
        // Removida a verificação que limitava apenas a chats diretos
      }
    });
    
    if (existingChatRoom) {
      return res.status(200).json({ 
        chatRoomId: existingChatRoom.id
      });
    }
    
    // Criar nova sala de chat
    const newChatRoom = await prisma.chatRoom.create({
      data: {
        userId: currentUserId as string,
        founderId: targetUserId,
        // Sem alertas associados para chat direto
        foundPetAlertId: null,
        lostPetAlertId: null
      }
    });
    
    res.status(201).json({ 
      chatRoomId: newChatRoom.id,
      message: 'Nova sala de chat criada' 
    });
    
  } catch (error) {
    console.error('Erro ao criar/obter chat direto:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação de chat' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'O conteúdo da mensagem é obrigatório' });
    }

    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id }
    });

    if (!chatRoom) {
      return res.status(404).json({ message: 'Sala de chat não encontrada' });
    }

    // Verificar se o usuário é participante do chat
    if (chatRoom.userId !== userId && chatRoom.founderId !== userId) {
      return res.status(403).json({ message: 'Você não tem permissão para enviar mensagens nesta sala de chat' });
    }

    // Criar a mensagem
    const message = await prisma.message.create({
      data: {
        content,
        chatRoomId: id,
        senderId: userId as string
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

    // Atualizar a data de atualização da sala de chat
    await prisma.chatRoom.update({
      where: { id },
      data: {
        updatedAt: new Date()
      }
    });

    res.status(201).json(message);
    
    // Em um sistema real, aqui enviaria uma notificação em tempo real para o outro usuário
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao enviar mensagem' });
  }
};

// Nova função para criar chat automaticamente quando uma reivindicação é aprovada
export const createChatForApprovedClaim = async (claimId: string) => {
  try {    // Buscar a reivindicação aprovada
    const claim = await prisma.petClaim.findUnique({
      where: { id: claimId },
      include: {
        foundAlert: true,
        lostAlert: true,
        claimant: true
      }
    });    if (!claim || claim.status !== 'APPROVED') {
      return null;
    }    // Determinar o usuário dono do alerta com base no tipo de alerta
    let alertOwnerId = '';
    let alertId = '';
    
    if (claim.alertType === 'FOUND' && claim.foundAlert) {
      alertOwnerId = claim.foundAlert.userId;
      alertId = claim.foundAlert.id;
    } else if (claim.alertType === 'LOST' && claim.lostAlert) {
      alertOwnerId = claim.lostAlert.userId;
      alertId = claim.lostAlert.id;
    } else {
      return null; // Tipo de alerta inválido ou alerta não encontrado
    }

    // Verificar se já existe QUALQUER chat entre esses usuários, independente do tipo
    const existingChatRoom = await prisma.chatRoom.findFirst({
      where: {
        OR: [
          { 
            userId: claim.claimantId,
            founderId: alertOwnerId 
          },
          { 
            userId: alertOwnerId,
            founderId: claim.claimantId 
          }
        ]
      }
    });

    if (existingChatRoom) {
      return existingChatRoom;
    }

    // Criar nova sala de chat conforme o tipo de alerta
    const chatRoomData = {
      userId: claim.claimantId,
      founderId: alertOwnerId,
      foundPetAlertId: claim.alertType === 'FOUND' ? alertId : null,
      lostPetAlertId: claim.alertType === 'LOST' ? alertId : null
    };

    const newChatRoom = await prisma.chatRoom.create({
      data: chatRoomData
    });

    return newChatRoom;
  } catch (error) {
    console.error('Erro ao criar chat para reivindicação aprovada:', error);
    return null;
  }
};