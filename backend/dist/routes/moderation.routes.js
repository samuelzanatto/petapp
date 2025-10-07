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
// Arquivo para testes de moderação de conteúdo
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path = __importStar(require("path"));
const auth_1 = __importDefault(require("../middlewares/auth"));
const contentModeration_1 = require("../services/contentModeration");
const router = (0, express_1.Router)();
// Configuração do Multer para armazenar imagens de teste
const uploadTestImage = (0, multer_1.default)({
    dest: path.resolve(__dirname, '..', '..', 'uploads', 'tests'),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    }
});
// Rota para testar moderação de texto
router.post('/text', auth_1.default, (async (req, res) => {
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
        const result = await (0, contentModeration_1.moderateText)(text);
        res.status(200).json({
            success: true,
            result,
            text
        });
    }
    catch (error) {
        console.error('Erro ao testar moderação de texto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao testar moderação de texto',
            error
        });
    }
}));
// Rota para testar moderação de imagem
router.post('/image', auth_1.default, uploadTestImage.single('image'), (async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'É necessário fornecer uma imagem para moderação'
            });
            return;
        }
        // Realizar moderação de imagem
        const result = await (0, contentModeration_1.moderateImage)(req.file.path);
        res.status(200).json({
            success: true,
            result,
            filePath: req.file.path
        });
    }
    catch (error) {
        console.error('Erro ao testar moderação de imagem:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao testar moderação de imagem',
            error
        });
    }
}));
exports.default = router;
