import { Request, Response } from 'express';
import { PrismaClient, NotificationType } from '@prisma/client';
import { sendPushNotification } from './notification.controller';

const prisma = new PrismaClient();

// Função para marcar um alerta de pet perdido como resolvido (pet recuperado)
export const markPetAsFound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // ID do alerta
    const { sightingId, resolution } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Verificar se o alerta existe e pertence ao usuário
    const alert = await prisma.lostPetAlert.findUnique({
      where: { id },
      include: {
        pet: true,
      }
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alerta não encontrado' });
    }

    // Verificar se o usuário é o dono do pet
    if (alert.userId !== userId) {
      return res.status(403).json({ 
        message: 'Você não tem permissão para marcar este pet como encontrado' 
      });
    }

    // Verificar se o alerta já está marcado como resolvido
    if (alert.status === 'FOUND') {
      return res.status(400).json({ 
        message: 'Este pet já está marcado como encontrado' 
      });
    }    
    
    // Transação para atualizar o alerta e adicionar informações de resolução
    const result = await prisma.$transaction(async (prisma) => {
      // Atualizar o status do alerta para FOUND
      const updatedAlert = await prisma.lostPetAlert.update({
        where: { id },
        data: {
          status: 'FOUND',
          updatedAt: new Date()
        }
      });

      // Se o avistamento que levou à recuperação foi especificado, atualizá-lo também
      if (sightingId) {
        // Verificar se o avistamento existe e pertence a este alerta
        const sighting = await prisma.petSighting.findFirst({
          where: {
            id: sightingId,
            alertId: id
          },
          include: {
            reporter: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        if (sighting) {
          // Cria uma notificação para o usuário que relatou ter encontrado o pet
          await prisma.notification.create({
            data: {
              userId: sighting.reportedBy,
              type: 'PET_FOUND' as NotificationType,
              title: `${alert.pet.name} foi recuperado!`,
              message: `O dono de ${alert.pet.name} confirmou que o pet foi recuperado graças ao seu relato. Obrigado pela sua ajuda!`,
              data: {
                alertId: id,
                petId: alert.petId,
                type: 'PET_FOUND_THANKS'
              },
              read: false,
              senderId: userId
            }
          });

          // Enviar notificação push
          await sendPushNotification(
            sighting.reportedBy,
            `${alert.pet.name} foi recuperado!`,
            `O dono de ${alert.pet.name} confirmou que o pet foi recuperado graças ao seu relato. Obrigado pela sua ajuda!`,
            {
              type: 'PET_FOUND_THANKS',
              alertId: id,
              petId: alert.petId
            }
          );
        }
      }

      // Coletar estatísticas de recuperação para análise
      await prisma.petRecoveryAnalytics.create({
        data: {
          alertId: id,
          petId: alert.petId,
          foundDate: new Date(),
          foundBySightingId: sightingId || null,
          foundMethod: sightingId ? 'SIGHTING' : 'OWNER',
          daysToRecover: Math.floor((new Date().getTime() - new Date(alert.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          notes: resolution || null
        }
      });

      return updatedAlert;
    });

    res.status(200).json({
      message: 'Pet marcado como encontrado',
      alert: result
    });
  } catch (error) {
    console.error('Erro ao marcar pet como encontrado:', error);
    res.status(500).json({ message: 'Erro ao marcar pet como encontrado' });
  }
};

// Função para obter estatísticas de recuperação de pets
export const getPetRecoveryStats = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }    // Buscar todos os pets do usuário que foram perdidos e recuperados
    const recoveredPets = await prisma.lostPetAlert.findMany({
      where: {
        userId: userId as string,
        status: 'FOUND'
      },      
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            primaryImage: true
          }
        },
        PetRecoveryAnalytics: true
      }
    });    // Calcular estatísticas gerais
    const totalRecovered = recoveredPets.length;
    const averageTimeToRecover = totalRecovered > 0 
      ? recoveredPets.reduce((acc, curr) => {
        const analytics = curr.PetRecoveryAnalytics; // Usando PetRecoveryAnalytics com P maiúsculo
        if (!analytics) return acc;
        return acc + analytics.daysToRecover;
      }, 0) / totalRecovered
      : 0;
    
    // Contabilizar métodos de recuperação
    const recoveryMethods = recoveredPets.reduce((acc, curr) => {
      const analytics = curr.PetRecoveryAnalytics; // Usando PetRecoveryAnalytics com P maiúsculo
      if (!analytics) return acc;
      
      const method = analytics.foundMethod;
      if (!acc[method]) acc[method] = 0;
      acc[method]++;
      
      return acc;
    }, {} as Record<string, number>);    res.status(200).json({
      totalRecovered,
      averageTimeToRecover,
      recoveryMethods,
      recoveredPets: recoveredPets.map(alert => ({
        id: alert.id,
        petId: alert.petId,
        petName: alert.pet.name,
        species: alert.pet.species,
        petImage: alert.pet.primaryImage,
        createdAt: alert.createdAt,
        foundDate: alert.PetRecoveryAnalytics?.foundDate || alert.updatedAt, // Usando PetRecoveryAnalytics
        daysToRecover: alert.PetRecoveryAnalytics?.daysToRecover || 0, // Usando PetRecoveryAnalytics
        foundMethod: alert.PetRecoveryAnalytics?.foundMethod || 'UNKNOWN' // Usando PetRecoveryAnalytics
      }))
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de recuperação:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas de recuperação' });
  }
};