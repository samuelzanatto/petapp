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
// filepath: h:\PetApp\backend\src\routes\claim.routes.ts
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const claimController = __importStar(require("../controllers/claim.controller"));
const auth_1 = __importDefault(require("../middlewares/auth"));
const router = (0, express_1.Router)();
// Configuração do Multer para upload de imagens de verificação
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/claims');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `claim_verification_${uniqueSuffix}-${file.originalname}`);
    }
});
const upload = (0, multer_1.default)({ storage });
// Aplicar middleware de autenticação em todas as rotas
router.use(auth_1.default);
// Rotas para reivindicações de pets
router.post('/', upload.array('verificationImages', 5), claimController.createPetClaim);
router.get('/', claimController.listMyPetClaims);
router.get('/received', claimController.listReceivedPetClaims);
router.get('/:id', claimController.getPetClaim);
router.get('/:id/details', claimController.getPetClaim); // Rota adicional para detalhes
router.post('/:id/verify', claimController.verifyPetClaim);
router.post('/:id/complete', claimController.completePetClaim);
router.post('/:id/cancel', claimController.cancelPetClaim);
router.post('/:id/status', claimController.updateClaimStatus);
exports.default = router;
