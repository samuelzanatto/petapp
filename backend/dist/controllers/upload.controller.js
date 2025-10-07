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
exports.uploadAlertImage = exports.uploadPostImage = exports.uploadPetImage = exports.uploadProfileImage = exports.uploadBase64Image = exports.uploadImage = void 0;
const client_1 = require("@prisma/client");
const config_1 = require("../config");
const supabaseStorage = __importStar(require("../services/supabaseStorage"));
const prisma = new client_1.PrismaClient();
const API_URL = config_1.config.baseUrl;
/**
 * Endpoint para upload via multipart form
 */
const uploadImage = async (req, res) => {
    try {
        const folder = (req.query.folder || 'posts');
        if (!req.file) {
            res.status(400).json({ message: 'Nenhuma imagem enviada' });
            return;
        }
        const buffer = req.file.buffer;
        const mimeType = req.file.mimetype;
        // Verificar se é uma imagem
        if (!mimeType.startsWith('image/')) {
            res.status(400).json({ message: 'Apenas imagens são permitidas' });
            return;
        }
        // A moderação da imagem já foi feita pelo middleware imageModerationMiddleware
        // Fazer upload para o Supabase Storage (sem moderação adicional)
        const result = await supabaseStorage.uploadImage(buffer, folder, mimeType, false);
        // Salvar no banco de dados (opcional)
        await prisma.mediaAsset.create({
            data: {
                id: result.id,
                path: result.path,
                versions: JSON.stringify(result.versions),
                mimeType,
                folder,
                createdAt: new Date()
            }
        });
        res.status(200).json({
            id: result.id,
            path: result.path,
            url: result.url,
            versions: result.versions
        });
    }
    catch (error) {
        console.error('Erro ao fazer upload da imagem:', error);
        res.status(500).json({ message: 'Erro ao processar a imagem' });
    }
};
exports.uploadImage = uploadImage;
/**
 * Endpoint para upload via base64
 */
const uploadBase64Image = async (req, res) => {
    try {
        const { base64Image, folder = 'posts' } = req.body;
        if (!base64Image) {
            res.status(400).json({ message: 'A imagem base64 é obrigatória' });
            return;
        }
        // Verificar formato base64
        if (!base64Image.includes('base64,')) {
            res.status(400).json({ message: 'Formato de imagem base64 inválido' });
            return;
        }
        // Extrair dados
        const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            res.status(400).json({ message: 'Formato de imagem base64 inválido' });
            return;
        }
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        // Verificar se é uma imagem
        if (!mimeType.startsWith('image/')) {
            res.status(400).json({ message: 'Apenas imagens são permitidas' });
            return;
        }
        // Fazer upload para o Supabase Storage (com moderação)
        const result = await supabaseStorage.uploadImage(buffer, folder, mimeType, true);
        // Salvar no banco de dados (opcional)
        await prisma.mediaAsset.create({
            data: {
                id: result.id,
                path: result.path,
                versions: JSON.stringify(result.versions),
                mimeType,
                folder,
                createdAt: new Date()
            }
        });
        res.status(200).json({
            id: result.id,
            path: result.path,
            url: result.url,
            versions: result.versions
        });
    }
    catch (error) {
        console.error('Erro ao processar upload de imagem base64:', error);
        if (error instanceof Error && error.message.includes('conteúdo impróprio')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        res.status(500).json({ message: 'Erro ao processar a imagem' });
    }
};
exports.uploadBase64Image = uploadBase64Image;
/**
 * Handler para upload de imagem de perfil
 */
const uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'Nenhuma imagem enviada' });
            return;
        }
        const buffer = req.file.buffer;
        const mimeType = req.file.mimetype;
        // Fazer upload para o Supabase Storage (sem moderação adicional, já foi feita)
        const result = await supabaseStorage.uploadImage(buffer, 'users', mimeType, false);
        // Atualizar o perfil do usuário
        await prisma.user.update({
            where: { id: req.userId },
            data: { profileImage: result.url }
        });
        res.status(200).json({
            success: true,
            imageUrl: result.url,
            versions: result.versions
        });
    }
    catch (error) {
        console.error('Erro ao atualizar imagem de perfil:', error);
        res.status(500).json({ message: 'Erro ao atualizar imagem de perfil' });
    }
};
exports.uploadProfileImage = uploadProfileImage;
/**
 * Handler para upload de imagens de pet
 */
const uploadPetImage = async (req, res) => {
    try {
        const { petId } = req.body;
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            res.status(400).json({ message: 'Nenhuma imagem enviada' });
            return;
        }
        if (!petId) {
            res.status(400).json({ message: 'ID do pet é obrigatório' });
            return;
        }
        // Verificar se o pet pertence ao usuário logado
        const pet = await prisma.pet.findFirst({
            where: {
                id: petId,
                ownerId: req.userId
            }
        });
        if (!pet) {
            res.status(403).json({ message: 'Pet não encontrado ou não pertence ao usuário' });
            return;
        }
        // Fazer upload de todas as imagens
        const uploadPromises = req.files.map(async (file) => {
            const buffer = file.buffer;
            const mimeType = file.mimetype;
            const result = await supabaseStorage.uploadImage(buffer, 'pets', mimeType, false);
            return result.url;
        });
        const imageUrls = await Promise.all(uploadPromises);
        // Se for a primeira imagem, definir como imagem principal
        if (!pet.primaryImage && imageUrls.length > 0) {
            await prisma.pet.update({
                where: { id: petId },
                data: {
                    primaryImage: imageUrls[0],
                    images: {
                        set: imageUrls
                    }
                }
            });
        }
        else {
            // Adicionar às imagens existentes
            await prisma.pet.update({
                where: { id: petId },
                data: {
                    images: {
                        push: imageUrls
                    }
                }
            });
        }
        res.status(200).json({
            success: true,
            images: imageUrls
        });
    }
    catch (error) {
        console.error('Erro ao fazer upload das imagens do pet:', error);
        res.status(500).json({ message: 'Erro ao processar imagens do pet' });
    }
};
exports.uploadPetImage = uploadPetImage;
/**
 * Handler para upload de imagens de post
 */
const uploadPostImage = async (req, res) => {
    try {
        const { postId } = req.body;
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            res.status(400).json({ message: 'Nenhuma imagem enviada' });
            return;
        }
        // No caso de múltiplas imagens, usar apenas a primeira
        const file = req.files[0];
        const buffer = file.buffer;
        const mimeType = file.mimetype;
        // Fazer upload para o Supabase Storage
        const result = await supabaseStorage.uploadImage(buffer, 'posts', mimeType, false);
        // No caso de ser um post novo, apenas retornamos o caminho para o frontend adicionar ao criar o post
        if (!postId) {
            res.status(200).json({
                success: true,
                imagePath: result.url,
                imageUrl: result.url,
                versions: result.versions
            });
            return;
        }
        // Verificar se o post pertence ao usuário
        const post = await prisma.post.findFirst({
            where: {
                id: postId,
                userId: req.userId
            }
        });
        if (!post) {
            res.status(403).json({ message: 'Post não encontrado ou não pertence ao usuário' });
            return;
        }
        // Atualizar imagem do post existente
        await prisma.post.update({
            where: { id: postId },
            data: {
                image: result.url
            }
        });
        res.status(200).json({
            success: true,
            imagePath: result.url,
            imageUrl: result.url,
            versions: result.versions
        });
    }
    catch (error) {
        console.error('Erro ao fazer upload da imagem do post:', error);
        res.status(500).json({ message: 'Erro ao processar imagem do post' });
    }
};
exports.uploadPostImage = uploadPostImage;
/**
 * Handler para upload de imagem de alerta
 */
const uploadAlertImage = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'Nenhuma imagem enviada' });
            return;
        }
        const buffer = req.file.buffer;
        const mimeType = req.file.mimetype;
        // Fazer upload para o Supabase Storage
        const result = await supabaseStorage.uploadImage(buffer, 'alerts', mimeType, false);
        res.status(200).json({
            success: true,
            imagePath: result.url,
            imageUrl: result.url,
            versions: result.versions
        });
    }
    catch (error) {
        console.error('Erro ao fazer upload da imagem de alerta:', error);
        res.status(500).json({ message: 'Erro ao processar imagem de alerta' });
    }
};
exports.uploadAlertImage = uploadAlertImage;
