import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

// Reportar avistamento de um pet perdido
export const reportPetSighting = async (req: Request, res: Response) => {
  try {
    const { 
      alertId, 
      latitude, 
      longitude, 
      locationName, 
      description, 
      contactInfo,
      sightedAt,
      hasFoundPet 
    } = req.body;
    
    const userId = req.userId;
    const imageFile = req.file;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Verificar se o alerta existe
    const alert = await prisma.lostPetAlert.findUnique({
      where: { id: alertId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            deviceTokens: true
          }
        },
        pet: {
          select: {
            id: true,
            name: true,
            primaryImage: true
          }
        }
      }
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alerta de pet perdido não encontrado' });
    }

    // Validar dados obrigatórios
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Localização é obrigatória para reportar um avistamento' });
    }

    // Criar o registro de avistamento
    const sighting = await prisma.petSighting.create({
      data: {
        alertId,
        reportedBy: userId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        locationName: locationName || null,
        description: description || '',
        sightedAt: sightedAt ? new Date(sightedAt) : new Date(),
        image: imageFile ? imageFile.path.replace(/\\/g, '/') : null,
        hasFoundPet: hasFoundPet === 'true' || hasFoundPet === true
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            email: true,
            phone: true
          }
        },
        alert: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                deviceTokens: true
              }
            }
          }
        }
      }
    });

    // Se o pet foi encontrado, atualizar o status do alerta
    if (sighting.hasFoundPet) {
      await prisma.lostPetAlert.update({
        where: { id: alertId },
        data: { status: 'FOUND' }
      });
    }

    // Enviar notificação ao dono do pet
    if (sighting.alert.user.id !== userId) {
      // Importar a função de envio de notificação
      const { sendFullNotification } = require('./notification.controller');
      
      // Determinar título e mensagem baseados no tipo de avistamento
      const notificationTitle = sighting.hasFoundPet 
        ? '🚨 ATENÇÃO: Seu pet foi encontrado! 🚨' 
        : 'Novo avistamento reportado';
      
      const notificationMessage = sighting.hasFoundPet
        ? `${sighting.reporter.name} está com seu pet ${alert.pet.name}!` 
        : `Alguém avistou seu pet ${alert.pet.name}!`;
      
      // Criar notificação no banco de dados E enviar push notification imediatamente
      await sendFullNotification({
        userId: sighting.alert.user.id,
        type: sighting.hasFoundPet ? 'PET_FOUND' : 'PET_SIGHTING',
        title: notificationTitle,
        message: notificationMessage,
        data: {
          alertId: sighting.alertId,
          sightingId: sighting.id,
          petName: alert.pet.name,
          isFound: sighting.hasFoundPet,
          priority: 'high'
        },
        imageUrl: sighting.image || alert.pet.primaryImage,
        senderId: userId
      });
      
      console.log(`Notificação de ${sighting.hasFoundPet ? 'pet encontrado' : 'avistamento'} enviada para o usuário ${sighting.alert.user.id}`);
    }

    // Formatar URL da imagem para o cliente
    const formattedSighting = {
      ...sighting,
      image: sighting.image ? 
        (sighting.image.startsWith('http') ? sighting.image : `${config.baseUrl}/${sighting.image}`) 
        : null,
      reporter: {
        ...sighting.reporter,
        profileImage: sighting.reporter.profileImage ? 
          (sighting.reporter.profileImage.startsWith('http') ? 
            sighting.reporter.profileImage : 
            `${config.baseUrl}/${sighting.reporter.profileImage}`) 
          : null
      }
    };

    res.status(201).json({
      message: 'Avistamento reportado com sucesso',
      sighting: formattedSighting
    });
  } catch (error) {
    console.error('Erro ao reportar avistamento:', error);
    res.status(500).json({ message: 'Erro ao reportar avistamento' });
  }
};
