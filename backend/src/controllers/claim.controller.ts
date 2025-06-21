import { Request, Response } from 'express';
import { PrismaClient, NotificationType, ClaimStatus } from '@prisma/client';
import { config } from '../config';
import { createChatForApprovedClaim } from './chat.controller';
import { sendFullNotification } from './notification.controller';
import { 
  getAlertFromClaim, 
  getAlertOwnerIdFromClaim, 
  getAlertOwnerFromClaim,
  getAlertImageFromClaim,
  getPetFromClaim
} from '../utils/alertHelpers';

const prisma = new PrismaClient();

// Função auxiliar para formatar uma reivindicação
const formatClaim = (claim: any) => {
  const formattedClaim: any = {
    ...claim,
    // Formatar URL da imagem de perfil do reclamante se houver
    claimant: claim.claimant ? {
      ...claim.claimant,
      profileImage: claim.claimant.profileImage ? 
        (claim.claimant.profileImage.startsWith('http') ? 
          claim.claimant.profileImage : 
          `${config.baseUrl}/${claim.claimant.profileImage}`) : 
        null
    } : null,
    // Formatação do alerta
    alertDetails: null
  };

  // Adicionar detalhes do alerta formatados
  if (claim.alertType === 'FOUND' && claim.foundAlert) {
    formattedClaim.alertDetails = {
      ...claim.foundAlert,
      // Formatar URL da imagem do alerta
      image: claim.foundAlert.image ?
        (claim.foundAlert.image.startsWith('http') ?
          claim.foundAlert.image :
          `${config.baseUrl}/${claim.foundAlert.image}`) :
        null,
      // Formatar URL da imagem de perfil do usuário
      user: claim.foundAlert.user ? {
        ...claim.foundAlert.user,
        profileImage: claim.foundAlert.user.profileImage ?
          (claim.foundAlert.user.profileImage.startsWith('http') ?
            claim.foundAlert.user.profileImage :
            `${config.baseUrl}/${claim.foundAlert.user.profileImage}`) :
          null
      } : null
    };
  } else if (claim.alertType === 'LOST' && claim.lostAlert) {
    formattedClaim.alertDetails = {
      ...claim.lostAlert,
      // Formatar URL da imagem de perfil do usuário
      user: claim.lostAlert.user ? {
        ...claim.lostAlert.user,
        profileImage: claim.lostAlert.user.profileImage ?
          (claim.lostAlert.user.profileImage.startsWith('http') ?
            claim.lostAlert.user.profileImage :
            `${config.baseUrl}/${claim.lostAlert.user.profileImage}`) :
          null
      } : null,
      // Incluir detalhes do pet se disponíveis
      pet: claim.lostAlert.pet ? {
        ...claim.lostAlert.pet,
        primaryImage: claim.lostAlert.pet.primaryImage ?
          (claim.lostAlert.pet.primaryImage.startsWith('http') ?
            claim.lostAlert.pet.primaryImage :
            `${config.baseUrl}/${claim.lostAlert.pet.primaryImage}`) :
          null
      } : null
    };
  }

  return formattedClaim;
};

/**
 * Criar uma nova reivindicação de pet
 */
export const createPetClaim = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const { alertId, alertType, verificationDetails } = req.body;
    
    console.log(`Tentativa de criar reivindicação - userId: ${userId}, alertId: ${alertId}, alertType: ${alertType}`);

    if (!alertType || !['FOUND', 'LOST'].includes(alertType)) {
      console.log(`Erro: Tipo de alerta inválido: "${alertType}"`);
      return res.status(400).json({ message: 'Tipo de alerta inválido. Deve ser FOUND ou LOST' });
    }

    // Verificar se o alerta existe
    if (alertType === 'FOUND') {
      const foundAlert = await prisma.foundPetAlert.findUnique({
        where: { id: alertId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          }
        }
      });

      if (!foundAlert) {
        return res.status(404).json({ message: 'Alerta de pet encontrado não existe' });
      }

      // Verificar se o usuário não está reivindicando seu próprio alerta
      if (foundAlert.userId === userId) {
        return res.status(400).json({ message: 'Você não pode reivindicar seu próprio alerta' });
      }

      // Verificar se já existe uma reivindicação pendente para este alerta
      const existingClaim = await prisma.petClaim.findFirst({
        where: {
          ...(alertType === 'FOUND'
            ? { foundAlert: { is: { id: alertId } } }
            : { lostAlert:  { is: { id: alertId } } }),
          alertType,
          claimantId: userId,
          status: { in: ['PENDING', 'APPROVED'] }
        }
      });

      if (existingClaim) {
        return res.status(400).json({ 
          message: 'Você já tem uma reivindicação pendente ou aprovada para este alerta',
          claimId: existingClaim.id
        });
      }
    } else if (alertType === 'LOST') {
      const lostAlert = await prisma.lostPetAlert.findUnique({
        where: { id: alertId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          },
          pet: true
        }
      });

      if (!lostAlert) {
        return res.status(404).json({ message: 'Alerta de pet perdido não existe' });
      }

      // Verificar se o usuário não está reivindicando seu próprio alerta
      if (lostAlert.userId === userId) {
        return res.status(400).json({ message: 'Você não pode reivindicar seu próprio alerta' });
      }

      // Verificar se já existe uma reivindicação pendente para este alerta
      const existingClaim = await prisma.petClaim.findFirst({
        where: {
          ...(alertType === 'FOUND'
            ? { foundAlert: { is: { id: alertId } } }
            : { lostAlert:  { is: { id: alertId } } }),
          alertType,
          claimantId: userId,
          status: { in: ['PENDING', 'APPROVED'] }
        }
      });

      if (existingClaim) {
        return res.status(400).json({ 
          message: 'Você já tem uma reivindicação pendente ou aprovada para este alerta',
          claimId: existingClaim.id
        });
      }
    }    // Processar imagens de verificação (se houver)
    let verificationImages: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      verificationImages = await Promise.all(req.files.map(async (file: any) => {
        // Salvar imagem e retornar caminho
        return file.path || file.filename;
      }));
    }

    // Verificar novamente se o alerta existe para maior segurança
    let alertExists = false;
    if (alertType === 'FOUND') {
      const foundAlert = await prisma.foundPetAlert.findUnique({
        where: { id: alertId }
      });
      alertExists = !!foundAlert;
      if (!alertExists) {
        console.log(`Alerta FOUND com ID ${alertId} não encontrado no banco de dados`);
        return res.status(404).json({ message: 'Alerta de pet encontrado não existe ou foi removido' });
      }
    } else if (alertType === 'LOST') {
      const lostAlert = await prisma.lostPetAlert.findUnique({
        where: { id: alertId }
      });
      alertExists = !!lostAlert;
      if (!alertExists) {
        console.log(`Alerta LOST com ID ${alertId} não encontrado no banco de dados`);
        return res.status(404).json({ message: 'Alerta de pet perdido não existe ou foi removido' });
      }
    }

    // Se chegou aqui, o alerta existe
    // Criar a reivindicação
    const claim = await prisma.petClaim.create({
      data: {
        claimant: { connect: { id: userId } },
        alertType,
        ...(alertType === 'FOUND'
          ? { foundAlert: { connect: { id: alertId } } }
          : { lostAlert:  { connect: { id: alertId } } }),
        verificationDetails: verificationDetails || {},
        verificationImages
      },
      include: {
        claimant: true,
        foundAlert: {
          include: {
            user: true
          }
        },
        lostAlert: {
          include: {
            user: true,
            pet: true
          }
        }
      }
    });

    // Enviar notificação para o dono do alerta
    const alertOwner = getAlertOwnerFromClaim(claim);
    const alertOwnerId = getAlertOwnerIdFromClaim(claim);
    if (alertOwner && alertOwnerId) {
      // Buscar usuário reclamante para a notificação
      const claimant = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          profileImage: true
        }
      });

      // Preparar notificação
      let notificationTitle = '';
      let notificationMessage = '';
      let notificationImageUrl = undefined;

      if (claim.alertType === 'FOUND') {
        notificationTitle = 'Nova reivindicação de pet encontrado';
        notificationMessage = `${claimant?.name} enviou uma reivindicação para o pet que você encontrou.`;
        notificationImageUrl = claim.foundAlert?.image || claimant?.profileImage || undefined;
      } else if (claim.alertType === 'LOST') {
        notificationTitle = 'Nova reivindicação de pet perdido';
        notificationMessage = `${claimant?.name} diz ter encontrado seu pet (${claim.lostAlert?.pet?.name || 'Sem nome'}).`;
        notificationImageUrl = claim.lostAlert?.pet?.primaryImage || claimant?.profileImage || undefined;
      }

      // Se a URL da imagem não começa com http, adicionar o baseUrl
      if (notificationImageUrl && !notificationImageUrl.startsWith('http')) {
        notificationImageUrl = `${config.baseUrl}/${notificationImageUrl}`;
      }

      // Enviar a notificação push
      try {
        await sendFullNotification({
          userId: alertOwnerId,
          senderId: userId,
          type: 'CLAIM',
          title: notificationTitle,
          message: notificationMessage,
          imageUrl: notificationImageUrl,
          data: {
            claimId: claim.id,
            alertType,
            image: notificationImageUrl,
            body: notificationMessage,
            title: notificationTitle,
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          }
        });
        console.log(`Notificação de reivindicação enviada para o usuário ${alertOwnerId}`);
      } catch (notificationError) {
        console.error('Erro ao enviar notificação de reivindicação:', notificationError);
      }
    }

    // Retornar a reivindicação criada com a formatação adequada
    res.status(201).json({
      claim: formatClaim(claim),
      message: 'Reivindicação criada com sucesso, aguardando verificação'
    });
  } catch (error) {
    console.error('Erro ao criar reivindicação:', error);
    res.status(500).json({ message: 'Erro ao criar reivindicação' });
  }
};

/**
 * Buscar detalhes de uma reivindicação específica
 */
export const getPetClaim = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId as string;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const claim = await prisma.petClaim.findUnique({
      where: { id },
      include: {
        claimant: true,
        foundAlert: {
          include: {
            user: true
          }
        },
        lostAlert: {
          include: {
            user: true,
            pet: true
          }
        }
      }
    });

    if (!claim) {
      return res.status(404).json({ message: 'Reivindicação não encontrada' });
    }

    // Verificar se o usuário tem permissão para ver esta reivindicação
    const isClaimant = claim.claimantId === userId;
    const alertOwner = getAlertOwnerFromClaim(claim);
    const isAlertCreator = alertOwner?.id === userId;

    if (!isAlertCreator && !isClaimant) {
      return res.status(403).json({ message: 'Você não tem permissão para ver esta reivindicação' });
    }

    // Formatar a resposta com os dados adicionais do alerta
    const formattedResponse = formatClaim(claim);

    // Formatar URLs das imagens de verificação
    if (formattedResponse.verificationImages && formattedResponse.verificationImages.length > 0) {
      formattedResponse.verificationImages = formattedResponse.verificationImages.map((img: string) => 
        img.startsWith('http') ? img : `${config.baseUrl}/${img}`
      );
    }

    res.status(200).json(formattedResponse);
  } catch (error) {
    console.error('Erro ao buscar detalhes da reivindicação:', error);
    res.status(500).json({ message: 'Erro ao buscar detalhes da reivindicação' });
  }
};

/**
 * Listar reivindicações feitas pelo usuário logado
 */
export const listMyPetClaims = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Buscar todas as reivindicações feitas pelo usuário
    const claims = await prisma.petClaim.findMany({
      where: {
        claimantId: userId
      },
      include: {
        foundAlert: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            }
          }
        },
        lostAlert: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            },
            pet: true
          }
        },
        claimant: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formatar as reivindicações
    const formattedClaims = claims.map(claim => formatClaim(claim));

    res.status(200).json(formattedClaims);
  } catch (error) {
    console.error('Erro ao listar reivindicações do usuário:', error);
    res.status(500).json({ message: 'Erro ao listar reivindicações' });
  }
};

/**
 * Listar reivindicações para alertas criados pelo usuário
 */
export const listReceivedPetClaims = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Buscar alertas de pet encontrado criados pelo usuário
    const foundAlerts = await prisma.foundPetAlert.findMany({
      where: {
        userId
      },
      select: {
        id: true
      }
    });

    // Buscar alertas de pet perdido criados pelo usuário
    const lostAlerts = await prisma.lostPetAlert.findMany({
      where: {
        userId
      },
      select: {
        id: true
      }
    });

    // Obter IDs de todos os alertas do usuário
    const foundAlertIds = foundAlerts.map(alert => alert.id);
    const lostAlertIds = lostAlerts.map(alert => alert.id);    // Buscar reivindicações para esses alertas
    const claims = await prisma.petClaim.findMany({
      where: {
        OR: [
          {
            foundAlertId: { in: foundAlertIds },
            alertType: 'FOUND'
          },
          {
            lostAlertId: { in: lostAlertIds },
            alertType: 'LOST'
          }
        ]
      },
      include: {
        claimant: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        },
        foundAlert: {
          include: {
            user: true
          }
        },
        lostAlert: {
          include: {
            user: true,
            pet: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formatar as reivindicações
    const formattedClaims = claims.map(claim => formatClaim(claim));

    res.status(200).json(formattedClaims);
  } catch (error) {
    console.error('Erro ao listar reivindicações recebidas:', error);
    res.status(500).json({ message: 'Erro ao listar reivindicações recebidas' });
  }
};

/**
 * Verificar uma reivindicação de pet (aprovar ou rejeitar)
 */
export const verifyPetClaim = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, adminNotes, rejectionReason, meetingLocation, meetingDate, meetingNotes } = req.body;
    const userId = req.userId as string;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Validar ação
    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ message: 'Ação inválida. Deve ser APPROVE ou REJECT' });
    }

    // Buscar a reivindicação
    const claim = await prisma.petClaim.findUnique({
      where: { id },
      include: {
        claimant: true,
        foundAlert: {
          include: {
            user: true
          }
        },
        lostAlert: {
          include: {
            user: true,
            pet: true
          }
        }
      }
    });

    if (!claim) {
      return res.status(404).json({ message: 'Reivindicação não encontrada' });
    }

    // Verificar se o usuário tem permissão para verificar esta reivindicação
    const alertOwner = getAlertOwnerFromClaim(claim);
    if (!alertOwner || alertOwner.id !== userId) {
      return res.status(403).json({ message: 'Você não tem permissão para verificar esta reivindicação' });
    }

    // Atualizar status da reivindicação
    const updatedClaim = await prisma.petClaim.update({
      where: { id },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        verifiedById: userId,
        verifiedAt: new Date(),
        adminNotes,
        rejectionReason: action === 'REJECT' ? rejectionReason : null,
        ...(action === 'APPROVE' ? {
          meetingLocation,
          meetingDate: meetingDate ? new Date(meetingDate) : undefined,
          meetingNotes
        } : {})
      },
      include: {
        claimant: true,
        foundAlert: {
          include: {
            user: true
          }
        },
        lostAlert: {
          include: {
            user: true,
            pet: true
          }
        }
      }
    });

    // Registrar no histórico de status
    await prisma.claimStatusHistory.create({
      data: {
        claimId: id,
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        userId,
        comment: action === 'APPROVE' ? adminNotes : rejectionReason
      }
    });

    // Enviar notificação para o reclamante
    try {
      if (action === 'APPROVE') {
        await sendFullNotification({
          userId: claim.claimantId,
          senderId: userId,
          type: 'CLAIM',
          title: 'Reivindicação aprovada',
          message: `Sua reivindicação de pet foi aprovada por ${alertOwner.name}. Você será contatado para combinar a entrega.`,
          data: {
            claimId: claim.id,
            status: 'APPROVED',
            petId: claim.alertType === 'LOST' ? claim.lostAlert?.pet?.id : undefined,
            priority: 'high',
            body: `Sua reivindicação de pet foi aprovada por ${alertOwner.name}.`,
            title: 'Reivindicação aprovada'
          }
        });
        console.log(`Notificação de aprovação enviada para o usuário ${claim.claimantId}`);

        // Criar chat para a reivindicação aprovada
        try {
          await createChatForApprovedClaim(claim.id);
        } catch (chatError) {
          console.error('Erro ao criar chat para reivindicação aprovada:', chatError);
        }
      } else {
        await sendFullNotification({
          userId: claim.claimantId,
          senderId: userId,
          type: 'CLAIM',
          title: 'Reivindicação rejeitada',
          message: `Sua reivindicação de pet foi rejeitada. Motivo: ${rejectionReason || 'Não informado'}.`,
          data: {
            claimId: claim.id,
            status: 'REJECTED',
            priority: 'high',
            body: `Sua reivindicação de pet foi rejeitada.`,
            title: 'Reivindicação rejeitada'
          }
        });
        console.log(`Notificação de rejeição enviada para o usuário ${claim.claimantId}`);
      }
    } catch (notificationError) {
      console.error(`Erro ao enviar notificação de ${action === 'APPROVE' ? 'aprovação' : 'rejeição'}:`, notificationError);
    }

    res.status(200).json({
      claim: formatClaim(updatedClaim),
      message: action === 'APPROVE' ? 
        'Reivindicação aprovada com sucesso. Vocês podem combinar os detalhes da entrega do pet.' : 
        'Reivindicação rejeitada com sucesso.'
    });
  } catch (error) {
    console.error('Erro ao verificar reivindicação:', error);
    res.status(500).json({ message: 'Erro ao verificar reivindicação' });
  }
};

/**
 * Marcar uma reivindicação como concluída (pet entregue)
 */
export const completePetClaim = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId as string;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Buscar a reivindicação
    const claim = await prisma.petClaim.findUnique({
      where: { id },
      include: {
        claimant: true,
        foundAlert: {
          include: {
            user: true
          }
        },
        lostAlert: {
          include: {
            user: true,
            pet: true
          }
        }
      }
    });

    if (!claim) {
      return res.status(404).json({ message: 'Reivindicação não encontrada' });
    }

    // Verificar se o usuário é o dono do alerta
    const alertOwner = getAlertOwnerFromClaim(claim);
    if (!alertOwner || alertOwner.id !== userId) {
      return res.status(403).json({ message: 'Apenas quem encontrou o pet pode marcar como concluída' });
    }

    // Verificar status da reivindicação
    if (claim.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Apenas reivindicações aprovadas podem ser concluídas' });
    }    // Desativar o alerta de pet encontrado
    if (claim.alertType === 'FOUND' && claim.foundAlert && claim.foundAlertId) {
      await prisma.foundPetAlert.update({
        where: { id: claim.foundAlertId },
        data: {
          isActive: false
        }
      });
    }

    // Atualizar status da reivindicação para COMPLETED
    const updatedClaim = await prisma.petClaim.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      },
      include: {
        claimant: true,
        foundAlert: {
          include: {
            user: true
          }
        },
        lostAlert: {
          include: {
            user: true,
            pet: true
          }
        }
      }
    });

    // Registrar no histórico de status
    await prisma.claimStatusHistory.create({
      data: {
        claimId: id,
        status: 'COMPLETED',
        userId,
        comment: 'Pet entregue ao dono'
      }
    });

    // Enviar notificação para o reclamante
    try {
      await sendFullNotification({
        userId: claim.claimantId,
        senderId: userId,
        type: 'CLAIM',
        title: 'Pet entregue com sucesso',
        message: `${alertOwner.name} confirmou a entrega do pet. Reivindicação concluída com sucesso!`,
        data: {
          claimId: claim.id,
          status: 'COMPLETED',
          priority: 'high',
          body: `${alertOwner.name} confirmou a entrega do pet. Reivindicação concluída com sucesso!`,
          title: 'Pet entregue com sucesso'
        }
      });
      console.log(`Notificação de conclusão enviada para o usuário ${claim.claimantId}`);
    } catch (notificationError) {
      console.error('Erro ao enviar notificação de conclusão:', notificationError);
    }

    res.status(200).json({
      claim: formatClaim(updatedClaim),
      message: 'Reivindicação concluída com sucesso. Pet entregue ao dono!'
    });
  } catch (error) {
    console.error('Erro ao concluir reivindicação:', error);
    res.status(500).json({ message: 'Erro ao concluir reivindicação' });
  }
};

/**
 * Cancelar uma reivindicação
 */
export const cancelPetClaim = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId as string;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Buscar a reivindicação
    const claim = await prisma.petClaim.findUnique({
      where: { id },
      include: {
        claimant: true,
        foundAlert: {
          include: {
            user: true
          }
        },
        lostAlert: {
          include: {
            user: true,
            pet: true
          }
        }
      }
    });

    if (!claim) {
      return res.status(404).json({ message: 'Reivindicação não encontrada' });
    }

    // Verificar se o usuário é o reclamante
    if (claim.claimantId !== userId) {
      return res.status(403).json({ message: 'Apenas o reclamante pode cancelar a reivindicação' });
    }

    // Atualizar status da reivindicação para CANCELLED
    const updatedClaim = await prisma.petClaim.update({
      where: { id },
      data: {
        status: 'CANCELLED'
      },
      include: {
        claimant: true,
        foundAlert: {
          include: {
            user: true
          }
        },
        lostAlert: {
          include: {
            user: true,
            pet: true
          }
        }
      }
    });

    // Registrar no histórico de status
    await prisma.claimStatusHistory.create({
      data: {
        claimId: id,
        status: 'CANCELLED',
        userId,
        comment: 'Reivindicação cancelada pelo usuário'
      }
    });

    // Enviar notificação para o dono do alerta sobre o cancelamento
    try {
      const alertOwnerId = getAlertOwnerIdFromClaim(claim);
      if (alertOwnerId) {
        await sendFullNotification({
          userId: alertOwnerId,
          senderId: userId,
          type: NotificationType.CLAIM,
          title: 'Reivindicação cancelada',
          message: `${claim.claimant.name} cancelou a reivindicação do pet que você encontrou.`,
          data: {
            claimId: claim.id,
            status: 'CANCELLED',
            priority: 'medium',
            body: `${claim.claimant.name} cancelou a reivindicação do pet que você encontrou.`, 
            title: 'Reivindicação cancelada'
          }
        });
        console.log(`Notificação de cancelamento enviada para o usuário ${alertOwnerId}`);
      }
    } catch (notificationError) {
      console.error('Erro ao enviar notificação de cancelamento:', notificationError);
    }

    res.status(200).json({
      claim: formatClaim(updatedClaim),
      message: 'Reivindicação cancelada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao cancelar reivindicação:', error);
    res.status(500).json({ message: 'Erro ao cancelar reivindicação' });
  }
};

/**
 * Atualizar status de uma reivindicação (para uso geral)
 */
export const updateClaimStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const userId = req.userId as string;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Validar status
    if (!status || !['APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: 'Status inválido' });
    }

    // Buscar a reivindicação
    const claim = await prisma.petClaim.findUnique({
      where: { id },
      include: {
        claimant: true,
        foundAlert: {
          include: {
            user: true
          }
        },
        lostAlert: {
          include: {
            user: true,
            pet: true
          }
        }
      }
    });

    if (!claim) {
      return res.status(404).json({ message: 'Reivindicação não encontrada' });
    }

    // Verificar permissões
    const isClaimant = claim.claimantId === userId;
    const alertOwner = getAlertOwnerFromClaim(claim);
    const isAlertCreator = alertOwner?.id === userId;

    // Permissões específicas por ação
    if (status === 'APPROVED' || status === 'REJECTED') {
      if (!isAlertCreator) {
        return res.status(403).json({ message: 'Apenas o criador do alerta pode aprovar ou rejeitar' });
      }
    } else if (status === 'COMPLETED') {
      if (!isAlertCreator) {
        return res.status(403).json({ message: 'Apenas quem encontrou o pet pode marcar como concluída' });
      }
      if (claim.status !== 'APPROVED') {
        return res.status(400).json({ message: 'Apenas reivindicações aprovadas podem ser concluídas' });
      }
    } else if (status === 'CANCELLED') {
      if (!isClaimant) {
        return res.status(403).json({ message: 'Apenas o reclamante pode cancelar a reivindicação' });
      }
      if (!['PENDING', 'APPROVED'].includes(claim.status)) {
        return res.status(400).json({ message: 'Apenas reivindicações pendentes ou aprovadas podem ser canceladas' });
      }
    }    // Desativar o alerta de pet encontrado se for concluído
    if (status === 'COMPLETED' && claim.alertType === 'FOUND' && claim.foundAlertId) {
      await prisma.foundPetAlert.update({
        where: { id: claim.foundAlertId },
        data: {
          isActive: false
        }
      });
    }

    // Atualizar status da reivindicação
    const updatedClaim = await prisma.petClaim.update({
      where: { id },
      data: {
        status: status as ClaimStatus,
        ...((status === 'APPROVED' || status === 'REJECTED') ? {
          verifiedById: userId,
          verifiedAt: new Date()
        } : {}),
        ...(status === 'COMPLETED' ? {
          completedAt: new Date()
        } : {})
      },
      include: {
        claimant: true,
        foundAlert: {
          include: {
            user: true
          }
        },
        lostAlert: {
          include: {
            user: true,
            pet: true
          }
        }
      }
    });

    // Registrar o histórico de status
    await prisma.claimStatusHistory.create({
      data: {
        claimId: claim.id,
        status: status as ClaimStatus,
        userId,
        comment: comment || null
      }
    });

    // Determinar o destinatário da notificação (sempre é o outro usuário)
    const notificationUserId = isClaimant ? getAlertOwnerIdFromClaim(claim) : claim.claimantId;
    const senderName = isClaimant ? claim.claimant.name : alertOwner?.name;

    // Definir mensagem baseada no status
    let title = '';
    let message = '';

    switch(status) {
      case 'APPROVED':
        title = 'Reivindicação aprovada';
        message = `Sua reivindicação de pet foi aprovada por ${alertOwner?.name}.${comment ? ' Mensagem: ' + comment : ''}`;
        break;
      case 'REJECTED':
        title = 'Reivindicação rejeitada';
        message = `Sua reivindicação de pet foi rejeitada.${comment ? ' Motivo: ' + comment : ''}`;
        break;
      case 'COMPLETED':
        title = 'Reivindicação concluída';
        message = `${alertOwner?.name} confirmou a entrega do pet. Reivindicação concluída com sucesso!`;
        break;
      case 'CANCELLED':
        title = 'Atualização na reivindicação';
        message = `${senderName} cancelou a reivindicação.${comment ? ' Motivo: ' + comment : ''}`;
        break;
    }

    // Enviar notificação
    if (notificationUserId) {
      await sendFullNotification({
        userId: notificationUserId,
        senderId: userId,
        type: 'CLAIM',
        title,
        message,
        data: {
          claimId: claim.id,
          status,
          priority: 'high',
          body: message,
          title
        }
      });
    }

    // Se a reivindicação foi aprovada, criar chat
    if (status === 'APPROVED') {
      try {
        await createChatForApprovedClaim(claim.id);
      } catch (chatError) {
        console.error('Erro ao criar chat para reivindicação aprovada:', chatError);
      }
    }

    res.status(200).json({
      claim: formatClaim(updatedClaim),
      message: `Status da reivindicação atualizado para ${status}`
    });
  } catch (error) {
    console.error('Erro ao atualizar status da reivindicação:', error);
    res.status(500).json({ message: 'Erro ao atualizar status da reivindicação' });
  }
};
