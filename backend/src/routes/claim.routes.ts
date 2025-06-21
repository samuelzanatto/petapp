// filepath: h:\PetApp\backend\src\routes\claim.routes.ts
import { RequestHandler, Router } from 'express';
import multer from 'multer';
import * as claimController from '../controllers/claim.controller';
import authMiddleware from '../middlewares/auth';
import { ExpressHandler } from '../types/express.d';

const router = Router();

// Configuração do Multer para upload de imagens de verificação
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/claims');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `claim_verification_${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware as RequestHandler);

// Rotas para reivindicações de pets
router.post('/', upload.array('verificationImages', 5), claimController.createPetClaim as RequestHandler);
router.get('/', claimController.listMyPetClaims as RequestHandler);
router.get('/received', claimController.listReceivedPetClaims as RequestHandler);
router.get('/:id', claimController.getPetClaim as RequestHandler);
router.get('/:id/details', claimController.getPetClaim as RequestHandler); // Rota adicional para detalhes
router.post('/:id/verify', claimController.verifyPetClaim as RequestHandler);
router.post('/:id/complete', claimController.completePetClaim as RequestHandler);
router.post('/:id/cancel', claimController.cancelPetClaim as RequestHandler);
router.post('/:id/status', claimController.updateClaimStatus as RequestHandler);

export default router;