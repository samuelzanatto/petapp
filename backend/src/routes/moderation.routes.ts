// Arquivo para testes de moderação de conteúdo
import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as multerConfig from '../config/multer';
import authMiddleware from '../middlewares/auth';
import { moderateText, moderateImage } from '../services/contentModeration';
import { RequestHandler } from 'express';

const router = Router();

// Configuração do Multer para armazenar imagens de teste
const uploadTestImage = multer({ 
  dest: path.resolve(__dirname, '..', '..', 'uploads', 'tests'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

// Rota para testar moderação de texto
router.post('/text', authMiddleware, (async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      res.status(400).json({
        success: false,
        message: 'É necessário fornecer um texto para moderação'
      });
      return;
    }
    
    // Realizar moderação de texto
    const result = await moderateText(text);
    
    res.status(200).json({
      success: true,
      result,
      text
    });
  } catch (error) {
    console.error('Erro ao testar moderação de texto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao testar moderação de texto',
      error
    });
  }
}) as RequestHandler);

// Rota para testar moderação de imagem
router.post('/image', 
  authMiddleware, 
  uploadTestImage.single('image'), 
  (async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'É necessário fornecer uma imagem para moderação'
        });
        return;
      }
      
      // Realizar moderação de imagem
      const result = await moderateImage(req.file.path);
      
      res.status(200).json({
        success: true,
        result,
        filePath: req.file.path
      });
    } catch (error) {
      console.error('Erro ao testar moderação de imagem:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao testar moderação de imagem',
        error
      });
    }
  }) as RequestHandler
);

export default router;
