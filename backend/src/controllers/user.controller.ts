import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as fs from 'fs';

const prisma = new PrismaClient();

export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        profileImage: true,
        phone: true,
        whatsappPhone: true,
        emergencyPhone: true,
        emergencyContact: true,
        address: true,
        neighborhood: true,
        city: true,
        state: true,
        zipCode: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            pets: true,
            posts: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Erro ao buscar perfil do usuário:', error);
    res.status(500).json({ message: 'Erro ao buscar perfil do usuário' });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Removendo a validação obrigatória de autenticação
    // Se o usuário estiver autenticado, podemos verificar se está seguindo o perfil
    // Se não estiver, apenas retornamos os dados públicos do perfil
    
    const userId = id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        profileImage: true,
        phone: true,
        whatsappPhone: true,
        emergencyPhone: true,
        emergencyContact: true,
        address: true,
        neighborhood: true,
        city: true,
        state: true,
        zipCode: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            pets: true,
            posts: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar se o usuário logado está seguindo este perfil
    // (somente se o usuário estiver autenticado)
    let isFollowing = false;
    if (req.userId) {
      const followRecord = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: req.userId as string,
            followingId: userId
          }
        }
      });
      isFollowing = !!followRecord;
    }

    res.status(200).json({
      ...user,
      isFollowing
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar perfil do usuário' });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      email,
      bio, 
      phone, 
      whatsappPhone,
      emergencyPhone,
      emergencyContact,
      address,
      neighborhood,
      city,
      state,
      zipCode,
      latitude,
      longitude
    } = req.body;

    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Verificar se o email já está em uso (se estiver mudando)
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: userId }
        }
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Este email já está em uso por outro usuário' });
      }
    }

    // Processar a imagem do perfil
    let profileImagePath = undefined;
    if (req.file) {
      profileImagePath = req.file.path.replace(/\\/g, '/'); // Normalizar caminho para URLs
    }

    // Preparar dados para atualização
    const updateData: any = {
      name,
      email,
      bio,
      phone,
      whatsappPhone,
      emergencyPhone,
      emergencyContact,
      address,
      neighborhood,
      city,
      state,
      zipCode
    };

    // Adicionar imagem se foi enviada
    if (profileImagePath) {
      updateData.profileImage = profileImagePath;
    }

    // Adicionar coordenadas de localização se fornecidas
    if (latitude && longitude) {
      updateData.latitude = parseFloat(latitude);
      updateData.longitude = parseFloat(longitude);
    }

    // Filtrar valores undefined para não sobrescrever dados existentes com null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedUser = await prisma.user.update({
      where: {
        id: userId
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        profileImage: true,
        phone: true,
        whatsappPhone: true,
        emergencyPhone: true,
        emergencyContact: true,
        address: true,
        neighborhood: true,
        city: true,
        state: true,
        zipCode: true,
        latitude: true,
        longitude: true
      }
    });

    // Retornar URLs completos para imagens
    if (updatedUser.profileImage && !updatedUser.profileImage.startsWith('http')) {
      updatedUser.profileImage = `${req.protocol}://${req.get('host')}/${updatedUser.profileImage}`;
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar perfil do usuário' });
  }
};

export const updateUserLocation = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.userId;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude e longitude são obrigatórios' });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId
      },
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      }
    });

    res.status(200).json({
      message: 'Localização atualizada com sucesso',
      location: {
        latitude: updatedUser.latitude,
        longitude: updatedUser.longitude
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar localização do usuário' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias' });
    }

    // Buscar usuário para verificar a senha atual
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar se a senha atual está correta
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Senha atual incorreta' });
    }

    // Hash da nova senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Atualizar a senha
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.status(200).json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao alterar senha' });
  }
};

export const followUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const followerId = req.userId;

    // Não permitir seguir a si mesmo
    if (id === followerId) {
      return res.status(400).json({ message: 'Não é possível seguir a si mesmo' });
    }

    // Verificar se o usuário a ser seguido existe
    const userToFollow = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        profileImage: true
      }
    });

    if (!userToFollow) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Obter dados do usuário que está seguindo para usar na notificação
    const follower = await prisma.user.findUnique({
      where: { id: followerId as string },
      select: {
        id: true,
        name: true,
        profileImage: true
      }
    });

    if (!follower) {
      return res.status(404).json({ message: 'Usuário seguidor não encontrado' });
    }

    // Verificar se já está seguindo
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: followerId as string,
          followingId: id
        }
      }
    });

    if (existingFollow) {
      // Se já estiver seguindo, parar de seguir
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: followerId as string,
            followingId: id
          }
        }
      });

      res.status(200).json({ following: false });
    } else {
      // Se não estiver seguindo, começar a seguir
      await prisma.follow.create({
        data: {
          followerId: followerId as string,
          followingId: id
        }
      });      // Enviar notificação ao usuário que foi seguido
      try {
        // Importar função de notificação
        const { sendFullNotification } = require('../controllers/notification.controller');
        const { NotificationType } = require('@prisma/client');
        
        await sendFullNotification({
          userId: id, // ID do usuário sendo seguido (receptor da notificação)
          type: NotificationType.FOLLOW, // Garantir que estamos usando o enum correto
          title: 'Novo seguidor',
          message: `${follower.name} começou a seguir você`,
          imageUrl: follower.profileImage,
          senderId: followerId as string,
          data: {
            followerId: followerId,
            followerName: follower.name,
            followerImage: follower.profileImage,
            type: 'FOLLOW', // Tipo de notificação para processar corretamente no app
            notificationType: 'FOLLOW', // Duplicação por compatibilidade
            userData: { id: followerId }, // Campo adicional para compatibilidade
            screen: '/profile/[id]', // Tela para navegar em formato Expo Router
            screenParams: { id: followerId } // Parâmetros para a tela
          }
        });
        
        console.log(`Notificação de novo seguidor enviada para o usuário ${id}`);
      } catch (notificationError) {
        // Não falhar a operação principal se a notificação falhar
        console.error('Erro ao enviar notificação de novo seguidor:', notificationError);
      }

      res.status(200).json({ following: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao seguir/deixar de seguir usuário' });
  }
};

export const getFollowers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Se estiver buscando os seguidores do próprio perfil, use o ID do token
    const userId = id === 'me' ? req.userId : id;

    const followers = await prisma.follow.findMany({
      where: {
        followingId: userId
      },
      include: {
        follower: {
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

    // Formatar a resposta
    const formattedFollowers = followers.map(follow => ({
      id: follow.follower.id,
      name: follow.follower.name,
      profileImage: follow.follower.profileImage,
      followedAt: follow.createdAt
    }));

    res.status(200).json(formattedFollowers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar seguidores' });
  }
};

export const getFollowing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Se estiver buscando quem o próprio perfil segue, use o ID do token
    const userId = id === 'me' ? req.userId : id;

    const following = await prisma.follow.findMany({
      where: {
        followerId: userId
      },
      include: {
        following: {
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

    // Formatar a resposta
    const formattedFollowing = following.map(follow => ({
      id: follow.following.id,
      name: follow.following.name,
      profileImage: follow.following.profileImage,
      followedAt: follow.createdAt
    }));

    res.status(200).json(formattedFollowing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar usuários seguidos' });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: 'Termo de busca é obrigatório' });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        _count: {
          select: {
            followers: true,
            pets: true
          }
        }
      },
      take: 20 // Limitar resultados
    });

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar usuários' });
  }
};

export const getUserPets = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Se estiver buscando os pets do próprio perfil, use o ID do token
    const userId = id === 'me' ? req.userId : id;

    const pets = await prisma.pet.findMany({
      where: {
        ownerId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json(pets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar pets do usuário' });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    // Esta operação é sensível e deveria ter autenticação adicional
    // Em um cenário real, você pode querer verificar a senha ou enviar um código
    // por email antes de permitir a exclusão

    // Excluir o usuário e todos os dados relacionados
    // (Isso depende das configurações em cascata no seu modelo do Prisma)
    await prisma.user.delete({
      where: { id: userId }
    });

    res.status(200).json({ message: 'Conta excluída com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir conta' });
  }
};

export const discoverUsers = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    // Buscar usuários que o usuário atual não segue
    // e que tenham pelo menos 1 pet
    const suggestedUsers = await prisma.user.findMany({
      where: {
        id: { not: userId },
        // Não incluir usuários que já são seguidos
        followers: {
          none: {
            followerId: userId as string
          }
        },
        // Apenas usuários que têm pets
        pets: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        profileImage: true,
        _count: {
          select: {
            followers: true,
            pets: true
          }
        }
      },
      orderBy: [
        // Priorizar usuários com mais seguidores
        { followers: { _count: 'desc' } },
        // Depois usuários com mais pets
        { pets: { _count: 'desc' } }
      ],
      take: 10
    });
    
    res.status(200).json(suggestedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar sugestões de usuários' });
  }
};