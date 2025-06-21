import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = config.baseUrl;

const prisma = new PrismaClient();

export const createPost = async (req: Request, res: Response) => {
  try {
    const { caption, petId, imagePath } = req.body;
    const { latitude, longitude } = req.body;
    const userId = req.userId;

    if (!imagePath) {
      return res.status(400).json({ 
        message: 'O caminho da imagem é obrigatório para a postagem' 
      });
    }

    // Se um petId foi fornecido, verificar se o pet pertence ao usuário
    if (petId) {
      const pet = await prisma.pet.findUnique({
        where: { id: petId }
      });

      if (!pet) {
        return res.status(404).json({ message: 'Pet não encontrado' });
      }

      if (pet.ownerId !== userId) {
        return res.status(403).json({ message: 'Você não tem permissão para postar com este pet' });
      }
    }

    const post = await prisma.post.create({
      data: {
        userId: userId as string,
        petId: petId || null,
        caption,
        image: imagePath,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        },
        pet: petId ? {
          select: {
            id: true,
            name: true,
            species: true,
            primaryImage: true
          }
        } : undefined,
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    const formattedPost = {
      ...post,
      image: post.image.startsWith('http') 
        ? post.image 
        : `${API_URL}/${post.image}`,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      hasLiked: false
    };

    // Se esta é uma das primeiras fotos do pet e temos a localização,
    // e o usuário ainda não tem localização registrada, armazenar como residência
    if (petId && latitude && longitude) {
      const user = await prisma.user.findUnique({
        where: { id: userId as string }
      });

      if (user && !user.latitude && !user.longitude) {
        await prisma.user.update({
          where: { id: userId as string },
          data: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
          }
        });
      }
    }

    res.status(201).json(formattedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar postagem' });
  }
};

export const getPosts = async (req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        },
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            primaryImage: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Verificar se o usuário atual curtiu cada post
    const userId = req.userId;
    const postsWithLikeInfo = await Promise.all(
      posts.map(async (post) => {
        const like = await prisma.like.findUnique({
          where: {
            postId_userId: {
              postId: post.id,
              userId: userId as string
            }
          }
        });

        return {
          ...post,
          likesCount: post._count.likes,
          commentsCount: post._count.comments,
          hasLiked: !!like
        };
      })
    );

    res.status(200).json(postsWithLikeInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar postagens' });
  }
};

export const getPostsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const posts = await prisma.post.findMany({
      where: {
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        },
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            primaryImage: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Verificar se o usuário atual curtiu cada post
    const currentUserId = req.userId;
    const postsWithLikeInfo = await Promise.all(
      posts.map(async (post) => {
        const like = await prisma.like.findUnique({
          where: {
            postId_userId: {
              postId: post.id,
              userId: currentUserId as string
            }
          }
        });

        return {
          ...post,
          likesCount: post._count.likes,
          commentsCount: post._count.comments,
          hasLiked: !!like
        };
      })
    );

    res.status(200).json(postsWithLikeInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar postagens do usuário' });
  }
};

// Adicione esta função junto com as outras funções do controller
export const getPostById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        },
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            primaryImage: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ message: 'Post não encontrado' });
    }

    // Verificar se o usuário atual curtiu o post
    const like = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId: userId as string
        }
      }
    });

    // Formatar o caminho da imagem para URL completa
    // Assumindo que o caminho da imagem é relativo à pasta uploads
    const formattedPost = {
      ...post,
      image: post.image.startsWith('http') 
        ? post.image 
        : `${API_URL.replace('/api', '')}/${post.image.replace(/\\/g, '/')}`,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      hasLiked: !!like
    };

    res.status(200).json(formattedPost);
  } catch (error) {
    console.error('Erro ao buscar post por ID:', error);
    res.status(500).json({ message: 'Erro ao buscar detalhes do post' });
  }
};

export const likePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Verificar se o post existe
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    if (!post) {
      return res.status(404).json({ message: 'Postagem não encontrada' });
    }

    // Verificar se o usuário já curtiu o post
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId: userId as string
        }
      }
    });

    if (existingLike) {
      // Se já curtiu, remover a curtida
      await prisma.like.delete({
        where: {
          postId_userId: {
            postId: id,
            userId: userId as string
          }
        }
      });

      res.status(200).json({ liked: false });
    } else {
      // Se não curtiu, adicionar a curtida
      await prisma.like.create({
        data: {
          postId: id,
          userId: userId as string
        }
      });

      // Não notificar o usuário se ele curtiu seu próprio post
      if (post.userId !== userId) {
        // Buscar informações do usuário que curtiu
        const likedByUser = await prisma.user.findUnique({
          where: { id: userId as string },
          select: { name: true }
        });

        // Importar a função de envio de notificação
        const { sendFullNotification } = require('./notification.controller');

        // Enviar notificação para o dono do post
        await sendFullNotification({
          userId: post.userId,
          type: "LIKE",
          title: "Nova curtida",
          message: `${likedByUser?.name} curtiu sua postagem`,
          data: {
            postId: post.id,
            type: "LIKE"
          },
          senderId: userId as string
        });
      }

      res.status(200).json({ liked: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao curtir/descurtir postagem' });
  }
};

export const commentOnPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'O conteúdo do comentário é obrigatório' });
    }

    // Verificar se o post existe
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    if (!post) {
      return res.status(404).json({ message: 'Postagem não encontrada' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId: id,
        userId: userId as string
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

    // Não notificar o usuário se ele comentou no próprio post
    if (post.userId !== userId) {
      // Importar a função de envio de notificação
      const { sendFullNotification } = require('./notification.controller');

      // Enviar notificação para o dono do post
      await sendFullNotification({
        userId: post.userId,
        type: "COMMENT",
        title: "Novo comentário",
        message: `${comment.user.name} comentou: "${content.length > 30 ? content.substring(0, 30) + '...' : content}"`,
        data: {
          postId: post.id,
          commentId: comment.id,
          type: "COMMENT"
        },
        senderId: userId as string
      });
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao comentar na postagem' });
  }
};

export const getPostComments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se o post existe
    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      return res.status(404).json({ message: 'Postagem não encontrada' });
    }

    const comments = await prisma.comment.findMany({
      where: {
        postId: id
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

    res.status(200).json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar comentários da postagem' });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Verificar se o post existe
    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      return res.status(404).json({ message: 'Postagem não encontrada' });
    }

    // Verificar se o usuário é o dono do post
    if (post.userId !== userId) {
      return res.status(403).json({ message: 'Você não tem permissão para excluir esta postagem' });
    }

    // Excluir a imagem do sistema de arquivos
    if (post.image && fs.existsSync(post.image)) {
      fs.unlinkSync(post.image);
    }

    // Excluir o post (as curtidas e comentários serão excluídos em cascata conforme configurado no schema)
    await prisma.post.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Postagem excluída com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir postagem' });
  }
};