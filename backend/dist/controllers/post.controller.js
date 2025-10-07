"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePost = exports.getPostComments = exports.commentOnPost = exports.likePost = exports.getPostById = exports.getPostsByUser = exports.getPosts = exports.createPost = void 0;
const client_1 = require("@prisma/client");
const config_1 = require("../config");
const fs = __importStar(require("fs"));
const API_URL = config_1.config.baseUrl;
const prisma = new client_1.PrismaClient();
const createPost = async (req, res) => {
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
                userId: userId,
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
                where: { id: userId }
            });
            if (user && !user.latitude && !user.longitude) {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        latitude: parseFloat(latitude),
                        longitude: parseFloat(longitude)
                    }
                });
            }
        }
        res.status(201).json(formattedPost);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao criar postagem' });
    }
};
exports.createPost = createPost;
const getPosts = async (req, res) => {
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
        const postsWithLikeInfo = await Promise.all(posts.map(async (post) => {
            const like = await prisma.like.findUnique({
                where: {
                    postId_userId: {
                        postId: post.id,
                        userId: userId
                    }
                }
            });
            return {
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                hasLiked: !!like
            };
        }));
        res.status(200).json(postsWithLikeInfo);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar postagens' });
    }
};
exports.getPosts = getPosts;
const getPostsByUser = async (req, res) => {
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
        const postsWithLikeInfo = await Promise.all(posts.map(async (post) => {
            const like = await prisma.like.findUnique({
                where: {
                    postId_userId: {
                        postId: post.id,
                        userId: currentUserId
                    }
                }
            });
            return {
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                hasLiked: !!like
            };
        }));
        res.status(200).json(postsWithLikeInfo);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar postagens do usuário' });
    }
};
exports.getPostsByUser = getPostsByUser;
// Adicione esta função junto com as outras funções do controller
const getPostById = async (req, res) => {
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
                    userId: userId
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
    }
    catch (error) {
        console.error('Erro ao buscar post por ID:', error);
        res.status(500).json({ message: 'Erro ao buscar detalhes do post' });
    }
};
exports.getPostById = getPostById;
const likePost = async (req, res) => {
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
                    userId: userId
                }
            }
        });
        if (existingLike) {
            // Se já curtiu, remover a curtida
            await prisma.like.delete({
                where: {
                    postId_userId: {
                        postId: id,
                        userId: userId
                    }
                }
            });
            res.status(200).json({ liked: false });
        }
        else {
            // Se não curtiu, adicionar a curtida
            await prisma.like.create({
                data: {
                    postId: id,
                    userId: userId
                }
            });
            // Não notificar o usuário se ele curtiu seu próprio post
            if (post.userId !== userId) {
                // Buscar informações do usuário que curtiu
                const likedByUser = await prisma.user.findUnique({
                    where: { id: userId },
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
                    senderId: userId
                });
            }
            res.status(200).json({ liked: true });
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao curtir/descurtir postagem' });
    }
};
exports.likePost = likePost;
const commentOnPost = async (req, res) => {
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
                userId: userId
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
                senderId: userId
            });
        }
        res.status(201).json(comment);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao comentar na postagem' });
    }
};
exports.commentOnPost = commentOnPost;
const getPostComments = async (req, res) => {
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar comentários da postagem' });
    }
};
exports.getPostComments = getPostComments;
const deletePost = async (req, res) => {
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao excluir postagem' });
    }
};
exports.deletePost = deletePost;
