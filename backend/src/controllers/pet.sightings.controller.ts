import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

// Obter todos os avistamentos de um pet perdido
export const getPetSightings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // ID do alerta de pet perdido
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Verificar se o alerta existe
    const alert = await prisma.lostPetAlert.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alerta não encontrado' });
    }

    // Obter todos os avistamentos deste pet
    const sightings = await prisma.petSighting.findMany({
      where: { alertId: id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        }
      },
      orderBy: { sightedAt: 'desc' }
    });

    // Formatar URLs de imagens
    const formattedSightings = sightings.map(sighting => ({
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
    }));

    res.status(200).json(formattedSightings);
  } catch (error) {
    console.error('Erro ao buscar avistamentos:', error);
    res.status(500).json({ message: 'Erro ao buscar avistamentos' });
  }
};

// Obter detalhes de um avistamento específico
export const getSightingDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // ID do avistamento
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Buscar o avistamento com todas as informações necessárias
    const sighting = await prisma.petSighting.findUnique({
      where: { id },
      include: {
        alert: {
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
        },
        reporter: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            email: true
          }
        }
      }
    });

    if (!sighting) {
      return res.status(404).json({ message: 'Avistamento não encontrado' });
    }

    // Verificar se o usuário tem permissão para ver este avistamento
    // (ser o dono do pet ou quem reportou o avistamento)
    const isPetOwner = sighting.alert.userId === userId;
    const isReporter = sighting.reportedBy === userId;

    if (!isPetOwner && !isReporter) {
      return res.status(403).json({ message: 'Você não tem permissão para acessar este avistamento' });
    }

    // Formatar URLs de imagens
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
      },
      alert: {
        ...sighting.alert,
        user: {
          ...sighting.alert.user,
          profileImage: sighting.alert.user.profileImage ? 
            (sighting.alert.user.profileImage.startsWith('http') ? 
              sighting.alert.user.profileImage : 
              `${config.baseUrl}/${sighting.alert.user.profileImage}`) 
            : null
        }
      }
    };

    res.status(200).json(formattedSighting);
  } catch (error) {
    console.error('Erro ao buscar detalhes do avistamento:', error);
    res.status(500).json({ message: 'Erro ao buscar detalhes do avistamento' });
  }
};
