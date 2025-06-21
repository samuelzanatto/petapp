import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { comparePetImages } from '../services/comparison';
import * as path from 'path';

// Usar a configuração dinâmica em vez de um IP hardcoded
const API_URL = config.baseUrl;

// Definir os tipos para garantir que não haja erros de tipo implícito
interface FormattedPet {
  id: string;
  name: string;
  species: 'DOG' | 'CAT';
  breed: string | null;
  description: string;
  lastSeenLocation: string;
  foundAt: Date;
  createdAt: Date;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  similarity: number;
  ownerId: string;
  ownerName: string;
  ownerImage: string | null;
  bestMatchPetId?: string;
}

interface ComparisonResult {
  petId?: string;
  similarity: number;
  details?: any;
}

const prisma = new PrismaClient();
const DISTANCE_THRESHOLD = 10; // Distância em km para alertas

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

export const reportLostPet = async (req: Request, res: Response) => {
  try {
    const { 
      petId, 
      lastSeenLatitude, 
      lastSeenLongitude, 
      description, 
      lastSeenLocation,
      reward
    } = req.body;

    const userId = req.userId;

    // Verificar se o pet existe e pertence ao usuário
    const pet = await prisma.pet.findUnique({
      where: {
        id: petId
      }
    });

    if (!pet) {
      return res.status(404).json({ message: 'Pet não encontrado' });
    }

    if (pet.ownerId !== userId) {
      return res.status(403).json({ message: 'Você não tem permissão para reportar este pet como perdido' });
    }

    // Processar imagens do alerta se foram enviadas
    const alertImages: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        alertImages.push(file.path.replace(/\\/g, '/'));
      });
    }

    // Criar alerta
    const alert = await prisma.lostPetAlert.create({
      data: {
        petId,
        userId: userId as string,
        description,
        lastSeenLocation,
        latitude: parseFloat(lastSeenLatitude),
        longitude: parseFloat(lastSeenLongitude),
        status: "ACTIVE",
        isUrgent: false,
        lastSeenAt: new Date(),
        reward: reward ? parseFloat(reward) : null,
        images: alertImages
      },
      include: {
        pet: true,
        user: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });

    // Buscar usuários próximos
    const nearbyUsers = await prisma.user.findMany({
      where: {
        id: {
          not: userId as string
        },
        latitude: { not: null },
        longitude: { not: null }
      }
    });

    // Filtrar usuários dentro do raio de distância
    const usersToNotify = nearbyUsers.filter(user => {
      if (!user.latitude || !user.longitude || !lastSeenLatitude || !lastSeenLongitude) {
        return false;
      }
      
      const distance = calculateDistance(
        parseFloat(lastSeenLatitude), 
        parseFloat(lastSeenLongitude), 
        user.latitude, 
        user.longitude
      );
      
      return distance <= DISTANCE_THRESHOLD;
    });

    // Buscar pets encontrados que possam corresponder ao pet perdido
    const potentialMatches = await prisma.foundPetAlert.findMany({
      where: {
        species: pet.species,
        isActive: true,
        // Poderia adicionar mais filtros como cor, raça, etc.
      }
    });

    // Enviar resposta
    res.status(201).json({
      alert,
      notifiedUsers: usersToNotify.length,
      potentialMatches: potentialMatches.length
    });

    // Importar o serviço de notificações
    const { sendBulkFullNotifications } = require('./notification.controller');

    // Enviar notificações para usuários próximos
    if (usersToNotify.length > 0) {
      const userIds = usersToNotify.map(user => user.id);
      
      // Configurar a imagem para a notificação
      const imageUrl = pet.primaryImage || (alertImages.length > 0 ? alertImages[0] : null);
      
      // Nome formatado para o pet
      const petDescription = pet.breed ? `${pet.species === 'DOG' ? 'cachorro' : 'gato'} da raça ${pet.breed}` : 
                                        `${pet.species === 'DOG' ? 'cachorro' : 'gato'}`;
      
      // Enviar notificações para os usuários próximos
      await sendBulkFullNotifications({
        userIds,
        type: "LOST_PET",
        title: "Pet perdido próximo a você",
        message: `${pet.name}, um ${petDescription}, foi perdido a menos de ${DISTANCE_THRESHOLD}km de você.`,
        data: {
          alertId: alert.id,
          petId: pet.id,
          type: "LOST_PET",
          distance: DISTANCE_THRESHOLD
        },
        imageUrl,
        senderId: userId as string
      });
      
      console.log(`Notificações de pet perdido enviadas para ${usersToNotify.length} usuários`);
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao reportar pet perdido' });
  }
};

export const reportFoundPet = async (req: Request, res: Response) => {
  try {
    const { species, description, latitude, longitude, foundLocation, color } = req.body;
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({ message: 'Uma imagem do pet encontrado é obrigatória' });
    }

    // Criar alerta de pet encontrado
    const alert = await prisma.foundPetAlert.create({
      data: {
        userId: userId as string,
        image: req.file.path,
        description,
        foundLocation,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        species,
        color,
        isActive: true
      },
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

    // Buscar alertas de pets perdidos que correspondam à espécie
    const lostPetAlerts = await prisma.lostPetAlert.findMany({
      where: {
        status: "ACTIVE",
        pet: {
          species
        }
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            primaryImage: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });

    // Filtrar alertas por proximidade
    const potentialMatches = lostPetAlerts.filter(lostAlert => {
      if (!lostAlert.latitude || !lostAlert.longitude) {
        return false;
      }
      
      const distance = calculateDistance(
        parseFloat(latitude), 
        parseFloat(longitude), 
        lostAlert.latitude, 
        lostAlert.longitude
      );
      
      return distance <= DISTANCE_THRESHOLD;
    });

    res.status(201).json({
      alert,
      potentialMatches: potentialMatches.length
    });
    
    // Importar o serviço de notificações
    const { sendBulkFullNotifications, sendFullNotification } = require('./notification.controller');

    // 1. Enviar notificações para usuários próximos que tenham pets perdidos similares
    if (potentialMatches.length > 0) {
      // Obter IDs únicos dos usuários com pets perdidos
      const userIdsWithLostPets = [...new Set(potentialMatches.map(match => match.userId))];

      // Enviar notificações para os donos de pets perdidos
      await sendBulkFullNotifications({
        userIds: userIdsWithLostPets,
        type: "FOUND_PET",
        title: "Possível match para seu pet perdido",
        message: `Um ${species === 'DOG' ? 'cachorro' : 'gato'} ${color ? color : ''} foi encontrado próximo à última localização do seu pet perdido.`,
        data: {
          alertId: alert.id,
          type: "FOUND_PET",
          location: foundLocation
        },
        imageUrl: alert.image,
        senderId: userId as string
      });
      
      console.log(`Notificações de possível match enviadas para ${userIdsWithLostPets.length} donos de pets perdidos`);
    }
    
    // 2. Enviar notificações para usuários próximos em geral (exceto o usuário que criou o alerta)
    const nearbyUsers = await prisma.user.findMany({
      where: {
        id: {
          not: userId as string
        },
        latitude: { not: null },
        longitude: { not: null }
      }
    });
    
    // Filtrar usuários dentro do raio de distância
    const usersToNotify = nearbyUsers.filter(user => {
      if (!user.latitude || !user.longitude) {
        return false;
      }
      
      const distance = calculateDistance(
        parseFloat(latitude), 
        parseFloat(longitude), 
        user.latitude, 
        user.longitude
      );
      
      return distance <= DISTANCE_THRESHOLD;
    });
    
    // Remover usuários que já receberam notificação por terem pets perdidos
    const alreadyNotifiedUserIds = new Set(potentialMatches.map(match => match.userId));
    const additionalUsersToNotify = usersToNotify.filter(user => !alreadyNotifiedUserIds.has(user.id));
    
    if (additionalUsersToNotify.length > 0) {
      const userIds = additionalUsersToNotify.map(user => user.id);
      
      // Enviar notificações para os usuários próximos
      await sendBulkFullNotifications({
        userIds,
        type: "FOUND_PET",
        title: "Pet encontrado próximo a você",
        message: `Um ${species === 'DOG' ? 'cachorro' : 'gato'} ${color ? color : ''} foi encontrado a menos de ${DISTANCE_THRESHOLD}km de você.`,
        data: {
          alertId: alert.id,
          type: "FOUND_PET"
        },
        imageUrl: alert.image,
        senderId: userId as string
      });
      
      console.log(`Notificações de pet encontrado enviadas para ${additionalUsersToNotify.length} usuários próximos`);
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao reportar pet encontrado' });
  }
};

export const getLostPets = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius = DISTANCE_THRESHOLD } = req.query;
    
    const alerts = await prisma.lostPetAlert.findMany({
      where: {
        status: "ACTIVE"
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            primaryImage: true,
            gender: true
          }
        },
        user: {
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

    // Formatar dados antes de retornar
    const formattedAlerts = alerts.map(alert => ({
      id: alert.id,
      latitude: alert.latitude,
      longitude: alert.longitude,
      lastSeenLocation: alert.lastSeenLocation,
      description: alert.description,
      createdAt: alert.createdAt,
      lastSeenAt: alert.lastSeenAt || alert.createdAt,
      foundAt: alert.lastSeenAt || alert.createdAt, // Para compatibilidade com o frontend
      name: alert.pet.name,
      species: alert.pet.species,
      breed: alert.pet.breed,
      imageUrl: alert.pet.primaryImage 
        ? alert.pet.primaryImage.startsWith('http')
          ? alert.pet.primaryImage
          : `${API_URL}/${alert.pet.primaryImage.replace(/\\/g, '/')}`
        : null,
      ownerId: alert.userId,
      ownerName: alert.user.name,
      ownerImage: alert.user.profileImage
        ? alert.user.profileImage.startsWith('http')
          ? alert.user.profileImage
          : `${API_URL}/${alert.user.profileImage.replace(/\\/g, '/')}`
        : null
    }));

    // Se latitude e longitude fornecidas, filtrar por proximidade
    let filteredAlerts = formattedAlerts;
    
    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      const rad = parseFloat(radius as string) || 10; // Usar raio padrão maior (10km)
      
      // Filtrar apenas se as coordenadas forem válidas
      if (!isNaN(lat) && !isNaN(lon)) {
        filteredAlerts = formattedAlerts.filter(alert => {
          // Se o alerta não tiver coordenadas, ignorar no filtro
          if (!alert.latitude || !alert.longitude || 
              isNaN(alert.latitude) || isNaN(alert.longitude)) {
            return true; // Incluir alertas sem coordenadas
          }
          
          // Calcular distância
          const distance = calculateDistance(
            lat, 
            lon, 
            alert.latitude, 
            alert.longitude
          );
          
          // Log para debug
          console.log(`Pet: ${alert.name}, Distância: ${distance.toFixed(2)}km`);
          
          // Retornar true se estiver dentro do raio
          return distance <= rad;
        });
      }
    }

    if (filteredAlerts.length === 0) {
      console.log("Nenhum pet encontrado com os filtros. Total de alertas:", alerts.length);
    }

    res.status(200).json(filteredAlerts);
  } catch (error) {
    console.error("Erro na busca de pets perdidos:", error);
    res.status(500).json({ message: 'Erro ao buscar pets perdidos' });
  }
};

export const getLostPetAlertById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const alert = await prisma.lostPetAlert.findUnique({
      where: {
        id
      },
      include: {
        pet: true,
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            phone: true,
            whatsappPhone: true,
            emergencyPhone: true,
            emergencyContact: true
          }
        }
      }
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alerta não encontrado' });
    }

    // Formatar as URLs das imagens
    const formattedAlert = {
      ...alert,
      pet: {
        ...alert.pet,
        primaryImage: alert.pet.primaryImage 
          ? alert.pet.primaryImage.startsWith('http') 
            ? alert.pet.primaryImage 
            : `${API_URL}/${alert.pet.primaryImage.replace(/\\/g, '/')}`
          : null,
        // Certificar-se de que o campo images existe (adaptar conforme seu modelo)
        images: alert.pet.images 
          ? alert.pet.images.map(img => 
              img.startsWith('http') ? img : `${API_URL}/${img.replace(/\\/g, '/')}`)
          : [],
        gender: alert.pet.gender || null
      },
      user: {
        ...alert.user,
        profileImage: alert.user.profileImage
          ? alert.user.profileImage.startsWith('http')
            ? alert.user.profileImage
            : `${API_URL}/${alert.user.profileImage.replace(/\\/g, '/')}`
          : null
      }
    };

    res.status(200).json(formattedAlert);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar detalhes do alerta' });
  }
};

export const getFoundPets = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius = 10, compareWithUserPets } = req.query;
    const userId = req.userId;
    
    // Buscar alertas de pets encontrados
    const foundPets = await prisma.foundPetAlert.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: {
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

    // Formatar dados para o frontend
    const formattedPets = foundPets.map(pet => {
      // Determinar um nome melhor para o pet encontrado
      const petName = `${pet.species === 'DOG' ? 'Cachorro' : 'Gato'} ${
        pet.color ? pet.color : ''
      }`.trim();
      
      return {
        id: pet.id,
        name: petName, // Nome baseado na espécie e cor
        species: pet.species,
        breed: null, // Não existe breed no modelo
        description: pet.description || '',
        lastSeenLocation: pet.foundLocation || '',
        foundAt: pet.createdAt,
        createdAt: pet.createdAt,
        latitude: pet.latitude,
        longitude: pet.longitude,
        imageUrl: pet.image
          ? pet.image.startsWith('http')
            ? pet.image
            : `${API_URL}/${pet.image.replace(/\\/g, '/')}`
          : null,
        // Adicionar similaridade explicitamente (será calculada depois se compareWithUserPets=true)
        similarity: 0,
        ownerId: pet.userId,
        ownerName: pet.user.name,
        ownerImage: pet.user.profileImage
          ? pet.user.profileImage.startsWith('http')
            ? pet.user.profileImage
            : `${API_URL}/${pet.user.profileImage.replace(/\\/g, '/')}`
          : null
      };
    });

    // O resto da função permanece igual...
    // Se latitude e longitude fornecidas, filtrar por proximidade
    let filteredPets = formattedPets;
    
    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      const rad = parseFloat(radius as string);
      
      filteredPets = formattedPets.filter(pet => {
        if (!pet.latitude || !pet.longitude) return false;
        
        const distance = calculateDistance(
          lat, 
          lon, 
          pet.latitude, 
          pet.longitude
        );
        
        return distance <= rad;
      });
    }

    // Se solicitado comparação com pets do usuário
    if (compareWithUserPets === 'true' && userId) {
      try {
        const userPets = await prisma.pet.findMany({
          where: { ownerId: userId as string },
          select: { 
            id: true, 
            species: true,
            primaryImage: true 
          }
        });
        
        // Se o usuário tem pets com imagens, filtrar por similaridade
        if (userPets.length > 0 && userPets.some(p => p.primaryImage)) {
          const comparableUserPets = userPets.filter(p => p.primaryImage);
          
          // Array para armazenar resultados de comparação
          const comparisonResults: FormattedPet[] = [];
          
          // Para cada pet encontrado, comparar com os pets do usuário
          for (const foundPet of filteredPets) {
            // Só comparar pets da mesma espécie
            const samePets = comparableUserPets.filter(p => p.species === foundPet.species);
            
            if (samePets.length > 0 && foundPet.imageUrl) {
              // Extrair o caminho da imagem do pet encontrado
              let foundPetImagePath = foundPet.imageUrl;
              if (foundPetImagePath.startsWith(API_URL)) {
                foundPetImagePath = foundPetImagePath.replace(API_URL, '').trim();
                if (foundPetImagePath.startsWith('/')) {
                  foundPetImagePath = foundPetImagePath.substring(1);
                }
              }
              
              // Converter URL para caminho de arquivo local
              const foundPetLocalPath = path.resolve(foundPetImagePath);
              
              // Criar uma promessa para cada comparação
              const petPromises = samePets.map(async (userPet) => {
                if (!userPet.primaryImage) return { similarity: 0 };
                
                // Extrair o caminho da imagem do pet do usuário
                let userPetImagePath = userPet.primaryImage;
                if (userPetImagePath.startsWith(API_URL)) {
                  userPetImagePath = userPetImagePath.replace(API_URL, '').trim();
                  if (userPetImagePath.startsWith('/')) {
                    userPetImagePath = userPetImagePath.substring(1);
                  }
                }
                
                // Converter URL para caminho de arquivo local
                const userPetLocalPath = path.resolve(userPetImagePath);
                
                try {
                  // Usar o serviço real de comparação de imagens
                  const comparisonResult = await comparePetImages(
                    userPetLocalPath,
                    foundPetLocalPath
                  );
                  
                  return {
                    petId: userPet.id,
                    similarity: comparisonResult.success ? comparisonResult.similarity : 0,
                    details: comparisonResult
                  };
                } catch (err) {
                  console.error(`Erro ao comparar pet ${userPet.id} com pet encontrado ${foundPet.id}:`, err);
                  return { similarity: 0 };
                }
              });
              
              // Executar todas as comparações para este pet
              Promise.all(petPromises)
                .then(results => {
                  // Encontrar a maior similaridade entre os pets do usuário
                  const bestMatch = results.reduce((best, current) => 
                    current.similarity > best.similarity ? current : best, 
                    { similarity: 0 }
                  );
                  
                  // Adicionar o resultado com a melhor similaridade
                  comparisonResults.push({
                    ...foundPet,
                    similarity: bestMatch.similarity,
                    bestMatchPetId: bestMatch.petId
                  });
                  
                  // Se todos os resultados foram processados, enviar resposta
                  if (comparisonResults.length === filteredPets.length) {
                    // Ordenar por similaridade (mais similar primeiro)
                    comparisonResults.sort((a, b) => b.similarity - a.similarity);
                    
                    // Enviar resposta
                    res.status(200).json(comparisonResults);
                  }
                })
                .catch(error => {
                  console.error("Erro ao processar comparações:", error);
                });
              
            } else {
              // Se não tem como comparar, adicionar com baixa similaridade
              comparisonResults.push({
                ...foundPet,
                similarity: 0.1 // Similaridade baixa quando não pode comparar
              });
              
              // Se todos os resultados foram processados, enviar resposta
              if (comparisonResults.length === filteredPets.length) {
                // Ordenar por similaridade (mais similar primeiro)
                comparisonResults.sort((a, b) => b.similarity - a.similarity);
                
                // Enviar resposta
                res.status(200).json(comparisonResults);
              }
            }
          }
          
          // Se não houver pets para comparar, retornar a lista normal
          if (filteredPets.length === 0) {
            return res.status(200).json([]);
          }
          
          // Não enviar resposta aqui, pois isso será feito após todas as comparações
          return;
        }
      } catch (error) {
        console.error("Erro na comparação de imagens:", error);
        // Em caso de erro na comparação, continuamos com o fluxo normal
      }
    }

    // Retornar todos os pets filtrados por proximidade
    res.status(200).json(filteredPets);
  } catch (error) {
    console.error("Erro ao buscar pets encontrados:", error);
    res.status(500).json({ message: 'Erro ao buscar pets encontrados' });
  }
};

export const searchPetsByRadius = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius } = req.query;
    
    if (!latitude || !longitude || !radius) {
      return res.status(400).json({ message: 'Latitude, longitude e raio são obrigatórios' });
    }
    
    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const rad = parseFloat(radius as string);
    
    if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
      return res.status(400).json({ message: 'Parâmetros inválidos' });
    }
    
    // Buscar alertas de pets ENCONTRADOS (não perdidos)
    const alerts = await prisma.foundPetAlert.findMany({
      where: {
        isActive: true  // Somente alertas ativos
      },
      include: {
        user: {
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
    
    // Filtrar por distância
    const petsWithinRadius = alerts.filter(alert => {
      if (!alert.latitude || !alert.longitude) return false;
      
      const distance = calculateDistance(
        lat, 
        lng, 
        alert.latitude, 
        alert.longitude
      );
      
      return distance <= rad;
    });
    
    // Formatar resposta
    const formattedPets = petsWithinRadius.map(alert => ({
      id: alert.id,
      latitude: alert.latitude,
      longitude: alert.longitude,
      lastSeenLocation: alert.foundLocation || null,
      description: alert.description || '',
      createdAt: alert.createdAt,
      foundAt: alert.createdAt,
      name: `Pet ${alert.species.toLowerCase()}`,
      species: alert.species,
      breed: null,
      imageUrl: alert.image 
        ? alert.image.startsWith('http')
          ? alert.image
          : `${API_URL}/${alert.image.replace(/\\/g, '/')}`
        : null,
      ownerId: alert.userId,
      ownerName: alert.user.name,
      ownerImage: alert.user.profileImage
        ? alert.user.profileImage.startsWith('http')
          ? alert.user.profileImage
          : `${API_URL}/${alert.user.profileImage.replace(/\\/g, '/')}`
        : null
    }));
    
    res.status(200).json({ 
      pets: formattedPets, 
      count: formattedPets.length,
      radius: rad,
      center: { latitude: lat, longitude: lng }
    });
    
  } catch (error) {
    console.error('Erro na busca de pets por raio:', error);
    res.status(500).json({ message: 'Erro ao buscar pets' });
  }
};