import { Router } from 'express';
import multer from 'multer';
import * as uploadController from '../controllers/upload.controller';
import * as multerConfig from '../config/multer';
import authMiddleware from '../middlewares/auth';
import { comparePetImages } from '../services/comparison';
import * as path from 'path';
import { ExpressHandler } from '../types/express.d';
import { imageModerationMiddleware } from '../middlewares/contentModeration';
import { RequestHandler } from 'express';

const router = Router();

// Configurar upload para imagens de perfil
const uploadProfileImage = multer(multerConfig.profileConfig);

// Configurar upload para imagens de pets
const uploadPetImage = multer(multerConfig.petConfig);

// Configurar upload para imagens de posts
const uploadPostImage = multer(multerConfig.postConfig);

// Configurar upload para imagens de alerta
const uploadAlertImage = multer(multerConfig.alertConfig);

// Configuração do Multer para armazenar em memória (para processamento)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

// ===== Rotas básicas de upload =====

// Rota para upload via form-data (agora com moderação de buffer)
router.post('/image', authMiddleware, upload.single('image'), imageModerationMiddleware as RequestHandler, uploadController.uploadImage);

// Rota para upload via base64
router.post('/base64', authMiddleware, uploadController.uploadBase64Image);

// ===== Rotas específicas para tipos de conteúdo =====

// Rota para upload de imagem de perfil
router.post('/profile', authMiddleware, uploadProfileImage.single('image'), imageModerationMiddleware as RequestHandler, uploadController.uploadProfileImage);

// Rota para upload de imagem de pet
router.post('/pet', authMiddleware, uploadPetImage.array('images', 5), imageModerationMiddleware as RequestHandler, uploadController.uploadPetImage);

// Rota para upload de imagem de post
router.post('/post', authMiddleware, uploadPostImage.array('images', 5), imageModerationMiddleware as RequestHandler, uploadController.uploadPostImage);

// Rota para upload de imagem de alerta
router.post('/alert', authMiddleware, uploadAlertImage.single('image'), imageModerationMiddleware as RequestHandler, uploadController.uploadAlertImage);

// Rota para testar a comparação entre duas imagens
const compareTestHandler: ExpressHandler = async (req, res) => {
  try {
    const { image1, image2 } = req.body;
    
    if (!image1 || !image2) {
      res.status(400).json({ 
        success: false, 
        message: 'É necessário fornecer os caminhos das duas imagens a serem comparadas' 
      });
      return;
    }
    
    // Resolver caminhos completos das imagens
    const image1Path = path.resolve(image1);
    const image2Path = path.resolve(image2);
    
    console.log(`Testando comparação entre: ${image1Path} e ${image2Path}`);
    
    // Realizar a comparação
    const result = await comparePetImages(image1Path, image2Path);
    
    // Retornar resultado detalhado
    res.status(200).json({
      success: true,
      result,
      images: {
        image1: image1Path,
        image2: image2Path
      }
    });
  } catch (error) {
    console.error('Erro ao testar comparação:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao realizar a comparação',
      error: error
    });
  }
};

router.post('/compare-test', authMiddleware, compareTestHandler);

export default router;