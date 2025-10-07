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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const uploadController = __importStar(require("../controllers/upload.controller"));
const multerConfig = __importStar(require("../config/multer"));
const auth_1 = __importDefault(require("../middlewares/auth"));
const comparison_1 = require("../services/comparison");
const path = __importStar(require("path"));
const contentModeration_1 = require("../middlewares/contentModeration");
const router = (0, express_1.Router)();
// Configurar upload para imagens de perfil
const uploadProfileImage = (0, multer_1.default)(multerConfig.profileConfig);
// Configurar upload para imagens de pets
const uploadPetImage = (0, multer_1.default)(multerConfig.petConfig);
// Configurar upload para imagens de posts
const uploadPostImage = (0, multer_1.default)(multerConfig.postConfig);
// Configurar upload para imagens de alerta
const uploadAlertImage = (0, multer_1.default)(multerConfig.alertConfig);
// Configuração do Multer para armazenar em memória (para processamento)
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    }
});
// ===== Rotas básicas de upload =====
// Rota para upload via form-data (agora com moderação de buffer)
router.post('/image', auth_1.default, upload.single('image'), contentModeration_1.imageModerationMiddleware, uploadController.uploadImage);
// Rota para upload via base64
router.post('/base64', auth_1.default, uploadController.uploadBase64Image);
// ===== Rotas específicas para tipos de conteúdo =====
// Rota para upload de imagem de perfil
router.post('/profile', auth_1.default, uploadProfileImage.single('image'), contentModeration_1.imageModerationMiddleware, uploadController.uploadProfileImage);
// Rota para upload de imagem de pet
router.post('/pet', auth_1.default, uploadPetImage.array('images', 5), contentModeration_1.imageModerationMiddleware, uploadController.uploadPetImage);
// Rota para upload de imagem de post
router.post('/post', auth_1.default, uploadPostImage.array('images', 5), contentModeration_1.imageModerationMiddleware, uploadController.uploadPostImage);
// Rota para upload de imagem de alerta
router.post('/alert', auth_1.default, uploadAlertImage.single('image'), contentModeration_1.imageModerationMiddleware, uploadController.uploadAlertImage);
// Rota para testar a comparação entre duas imagens
const compareTestHandler = async (req, res) => {
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
        const result = await (0, comparison_1.comparePetImages)(image1Path, image2Path);
        // Retornar resultado detalhado
        res.status(200).json({
            success: true,
            result,
            images: {
                image1: image1Path,
                image2: image2Path
            }
        });
    }
    catch (error) {
        console.error('Erro ao testar comparação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao realizar a comparação',
            error: error
        });
    }
};
router.post('/compare-test', auth_1.default, compareTestHandler);
exports.default = router;
