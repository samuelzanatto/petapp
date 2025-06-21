import { RequestHandler, Router } from 'express';
import { deleteComment } from '../controllers/comment.controller';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware as RequestHandler);

// Rotas de comentários
router.delete('/:commentId', deleteComment as RequestHandler);

export default router;
