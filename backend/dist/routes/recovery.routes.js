"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pet_recovery_controller_1 = require("../controllers/pet.recovery.controller");
const auth_1 = __importDefault(require("../middlewares/auth"));
const router = (0, express_1.Router)();
// Aplicar middleware de autenticação em todas as rotas
router.use(auth_1.default);
// Rota para marcar um pet como encontrado
router.put('/lost/:id/found', pet_recovery_controller_1.markPetAsFound);
// Rota para obter estatísticas de recuperação
router.get('/recovery/stats', pet_recovery_controller_1.getPetRecoveryStats);
exports.default = router;
