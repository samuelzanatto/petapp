import { Router, RequestHandler } from 'express';
import { markPetAsFound, getPetRecoveryStats } from '../controllers/pet.recovery.controller';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware as RequestHandler);

// Rota para marcar um pet como encontrado
router.put('/lost/:id/found', markPetAsFound as RequestHandler);

// Rota para obter estatísticas de recuperação
router.get('/recovery/stats', getPetRecoveryStats as RequestHandler);

export default router;
