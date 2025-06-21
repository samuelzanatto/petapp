import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { ExpressHandler } from '../types/express.d';
import { moderateImageBuffer } from '../services/bufferModeration';

const prisma = new PrismaClient();
const API_URL = config.baseUrl;

type ImageSize = {
  width: number;
  height: number;
  suffix: string;
};

// Configurações para diferentes tamanhos de imagem
const IMAGE_SIZES: Record<string, ImageSize[]> = {
  posts: [
    { width: 1080, height: 1080, suffix: 'full' },
    { width: 600, height: 600, suffix: 'medium' },
    { width: 320, height: 320, suffix: 'thumbnail' }
  ],
  pets: [
    { width: 800, height: 800, suffix: 'full' },
    { width: 400, height: 400, suffix: 'medium' },
    { width: 150, height: 150, suffix: 'thumbnail' }
  ],
  users: [
    { width: 400, height: 400, suffix: 'full' },
    { width: 150, height: 150, suffix: 'thumbnail' }
  ],
  alerts: [
    { width: 800, height: 800, suffix: 'full' },
    { width: 400, height: 400, suffix: 'medium' }
  ],
  default: [
    { width: 1000, height: 1000, suffix: 'full' },
    { width: 500, height: 500, suffix: 'medium' },
    { width: 200, height: 200, suffix: 'thumbnail' }
  ]
};

/**
 * Processa uma imagem em vários tamanhos e salva no servidor
 */
async function processAndSaveImage(
  buffer: Buffer, 
  folder: string, 
  mimeType: string
): Promise<{ id: string; path: string; versions: Record<string, string> }> {
  const imageId = uuidv4();
  const baseDir = path.join(__dirname, '../../uploads', folder);
  
  // Criamos diretório se não existir
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  // Determinar extensão
  let extension = 'jpg';
  if (mimeType === 'image/png') extension = 'png';
  if (mimeType === 'image/gif') extension = 'gif';
  if (mimeType === 'image/webp') extension = 'webp';
  
  // Escolher os tamanhos com base na pasta
  const sizes = IMAGE_SIZES[folder] || IMAGE_SIZES.default;
  
  // Processar cada tamanho
  const versions: Record<string, string> = {};
  
  for (const size of sizes) {
    const filename = `${imageId}_${size.suffix}.${extension}`;
    const filePath = path.join(baseDir, filename);
    const relativePath = path.join('uploads', folder, filename).replace(/\\/g, '/');
    
    try {
      // Processar com Sharp (otimização e redimensionamento)
      await sharp(buffer)
        .resize(size.width, size.height, {
          fit: 'cover',
          position: 'center'
        })
        .toFile(filePath);
      
      // Adicionar ao objeto de versões
      versions[size.suffix] = relativePath;
    } catch (error) {
      console.error(`Erro ao processar imagem ${size.suffix}:`, error);
      throw new Error(`Falha ao processar imagem ${size.suffix}`);
    }
  }
  
  // Salvar no banco de dados (opcional)
  await prisma.mediaAsset.create({
    data: {
      id: imageId,
      path: versions.full || versions.medium || Object.values(versions)[0],
      versions: JSON.stringify(versions),
      mimeType,
      folder,
      createdAt: new Date()
    }
  });
  
  return {
    id: imageId,
    path: versions.full || versions.medium || Object.values(versions)[0],
    versions
  };
}

/**
 * Endpoint para upload via multipart form
 */
export const uploadImage: ExpressHandler = async (req: Request, res: Response) => {
  try {
    const folder = (req.query.folder || 'misc') as string;
    
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
    
    // Processar e salvar a imagem
    const result = await processAndSaveImage(buffer, folder, mimeType);
    
    // Retornar resultado com URLs completas
    const urlVersions: Record<string, string> = {};
    Object.entries(result.versions).forEach(([key, path]) => {
      urlVersions[key] = `${API_URL}/${path}`;
    });
    
    res.status(200).json({
      id: result.id,
      path: result.path,
      url: `${API_URL}/${result.path}`,
      versions: urlVersions
    });
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    res.status(500).json({ message: 'Erro ao processar a imagem' });
  }
};

/**
 * Endpoint para upload via base64
 */
export const uploadBase64Image: ExpressHandler = async (req: Request, res: Response) => {
  try {
    const { base64Image, folder = 'misc' } = req.body;
    
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
    
    // Para uploads base64, precisamos moderar aqui já que não passa pelo middleware
    const moderationResult = await moderateImageBuffer(buffer, mimeType);
    
    // Se a imagem foi rejeitada, informar ao usuário
    if (moderationResult.isFlagged) {
      return res.status(400).json({
        success: false,
        message: 'Imagem com conteúdo impróprio detectado. Por favor, envie uma imagem apropriada.',
        details: {
          unsafeContent: moderationResult.unsafeContent,
          safetyScores: moderationResult.safetyScores
        }
      });
    }
    
    // Processar a imagem
    const result = await processAndSaveImage(buffer, folder, mimeType);
    
    // Retornar resultado com URLs completas
    const urlVersions: Record<string, string> = {};
    Object.entries(result.versions).forEach(([key, path]) => {
      urlVersions[key] = `${API_URL}/${path}`;
    });
    
    res.status(200).json({
      id: result.id,
      path: result.path,
      url: `${API_URL}/${result.path}`,
      versions: urlVersions
    });
  } catch (error) {
    console.error('Erro ao processar upload de imagem base64:', error);
    res.status(500).json({ message: 'Erro ao processar a imagem' });
  }
};

/**
 * Handler para upload de imagem de perfil
 */
export const uploadProfileImage: ExpressHandler = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Nenhuma imagem enviada' });
      return;
    }

    // Atualizar o perfil do usuário
    await prisma.user.update({
      where: { id: req.userId as string },
      data: { profileImage: req.file.path.replace(/\\/g, '/') }
    });

    res.status(200).json({ 
      success: true, 
      imageUrl: `${API_URL}/${req.file.path.replace(/\\/g, '/')}` 
    });
  } catch (error) {
    console.error('Erro ao atualizar imagem de perfil:', error);
    res.status(500).json({ message: 'Erro ao atualizar imagem de perfil' });
  }
};

/**
 * Handler para upload de imagens de pet
 */
export const uploadPetImage: ExpressHandler = async (req: Request, res: Response) => {
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
        ownerId: req.userId as string
      }
    });

    if (!pet) {
      res.status(403).json({ message: 'Pet não encontrado ou não pertence ao usuário' });
      return;
    }

    // Atualizar imagens do pet
    const filePaths = req.files.map(file => file.path.replace(/\\/g, '/'));
    
    // Se for a primeira imagem, definir como imagem principal
    if (!pet.primaryImage && filePaths.length > 0) {
      await prisma.pet.update({
        where: { id: petId },
        data: { 
          primaryImage: filePaths[0],
          // Adicionar todas as imagens ao array de imagens
          images: {
            set: filePaths
          }
        }
      });
    } else {
      // Adicionar às imagens existentes
      await prisma.pet.update({
        where: { id: petId },
        data: {
          images: {
            push: filePaths
          }
        }
      });
    }

    res.status(200).json({ 
      success: true, 
      images: filePaths.map(path => `${API_URL}/${path}`) 
    });
  } catch (error) {
    console.error('Erro ao fazer upload das imagens do pet:', error);
    res.status(500).json({ message: 'Erro ao processar imagens do pet' });
  }
};

/**
 * Handler para upload de imagens de post
 */
export const uploadPostImage: ExpressHandler = async (req: Request, res: Response) => {
  try {
    const { postId } = req.body;
    
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({ message: 'Nenhuma imagem enviada' });
      return;
    }

    // No caso de múltiplas imagens, usar apenas a primeira
    const filePath = req.files[0].path.replace(/\\/g, '/');
    
    // No caso de ser um post novo, apenas retornamos o caminho para o frontend adicionar ao criar o post
    if (!postId) {
      res.status(200).json({ 
        success: true, 
        imagePath: filePath,
        imageUrl: `${API_URL}/${filePath}`
      });
      return;
    }

    // Verificar se o post pertence ao usuário
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        userId: req.userId as string
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
        image: filePath
      }
    });

    res.status(200).json({ 
      success: true, 
      imagePath: filePath,
      imageUrl: `${API_URL}/${filePath}`
    });
  } catch (error) {
    console.error('Erro ao fazer upload da imagem do post:', error);
    res.status(500).json({ message: 'Erro ao processar imagem do post' });
  }
};

/**
 * Handler para upload de imagem de alerta
 */
export const uploadAlertImage: ExpressHandler = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Nenhuma imagem enviada' });
      return;
    }

    // Simplesmente retornamos o caminho da imagem para uso posterior
    res.status(200).json({ 
      success: true, 
      imagePath: req.file.path.replace(/\\/g, '/'),
      imageUrl: `${API_URL}/${req.file.path.replace(/\\/g, '/')}` 
    });
  } catch (error) {
    console.error('Erro ao fazer upload da imagem de alerta:', error);
    res.status(500).json({ message: 'Erro ao processar imagem de alerta' });
  }
};