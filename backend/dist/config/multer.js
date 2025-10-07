"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertConfig = exports.postConfig = exports.petConfig = exports.profileConfig = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Criar diretório se não existir
const createFolderIfNotExists = (folderPath) => {
    if (!fs_1.default.existsSync(folderPath)) {
        fs_1.default.mkdirSync(folderPath, { recursive: true });
    }
};
// Configuração base para o Multer
const baseConfig = {
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path_1.default.resolve(__dirname, '../../uploads');
            createFolderIfNotExists(uploadPath);
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = path_1.default.extname(file.originalname);
            cb(null, uniquePrefix + '-' + file.fieldname + ext);
        }
    }),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        // Aceitar apenas imagens
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Apenas imagens são permitidas'));
        }
    }
};
// Configuração específica para imagens de perfil
exports.profileConfig = {
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path_1.default.resolve(__dirname, '../../uploads/users');
            createFolderIfNotExists(uploadPath);
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = path_1.default.extname(file.originalname);
            cb(null, 'profile_' + uniquePrefix + ext);
        }
    }),
    limits: baseConfig.limits,
    fileFilter: baseConfig.fileFilter
};
// Configuração específica para imagens de pets
exports.petConfig = {
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path_1.default.resolve(__dirname, '../../uploads/pets');
            createFolderIfNotExists(uploadPath);
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = path_1.default.extname(file.originalname);
            cb(null, 'pet_image_' + uniquePrefix + ext);
        }
    }),
    limits: baseConfig.limits,
    fileFilter: baseConfig.fileFilter
};
// Configuração específica para imagens de posts
exports.postConfig = {
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path_1.default.resolve(__dirname, '../../uploads/posts');
            createFolderIfNotExists(uploadPath);
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = path_1.default.extname(file.originalname);
            cb(null, 'post_' + uniquePrefix + ext);
        }
    }),
    limits: baseConfig.limits,
    fileFilter: baseConfig.fileFilter
};
// Configuração específica para imagens de alertas
exports.alertConfig = {
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path_1.default.resolve(__dirname, '../../uploads/alerts');
            createFolderIfNotExists(uploadPath);
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = path_1.default.extname(file.originalname);
            const prefix = req.body.alertType === 'LOST' ? 'lost_pet_image_' : 'found_pet_';
            cb(null, prefix + uniqueSuffix + ext);
        }
    }),
    limits: baseConfig.limits,
    fileFilter: baseConfig.fileFilter
};
