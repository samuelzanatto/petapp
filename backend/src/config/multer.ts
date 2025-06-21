import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Criar diretório se não existir
const createFolderIfNotExists = (folderPath: string) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

// Configuração base para o Multer
const baseConfig = {
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.resolve(__dirname, '../../uploads');
      createFolderIfNotExists(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniquePrefix + '-' + file.fieldname + ext);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  }
};

// Configuração específica para imagens de perfil
export const profileConfig = {
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.resolve(__dirname, '../../uploads/users');
      createFolderIfNotExists(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, 'profile_' + uniquePrefix + ext);
    }
  }),
  limits: baseConfig.limits,
  fileFilter: baseConfig.fileFilter
};

// Configuração específica para imagens de pets
export const petConfig = {
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.resolve(__dirname, '../../uploads/pets');
      createFolderIfNotExists(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, 'pet_image_' + uniquePrefix + ext);
    }
  }),
  limits: baseConfig.limits,
  fileFilter: baseConfig.fileFilter
};

// Configuração específica para imagens de posts
export const postConfig = {
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.resolve(__dirname, '../../uploads/posts');
      createFolderIfNotExists(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, 'post_' + uniquePrefix + ext);
    }
  }),
  limits: baseConfig.limits,
  fileFilter: baseConfig.fileFilter
};

// Configuração específica para imagens de alertas
export const alertConfig = {
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.resolve(__dirname, '../../uploads/alerts');
      createFolderIfNotExists(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const prefix = req.body.alertType === 'LOST' ? 'lost_pet_image_' : 'found_pet_';
      cb(null, prefix + uniqueSuffix + ext);
    }
  }),
  limits: baseConfig.limits,
  fileFilter: baseConfig.fileFilter
};