import { RequestHandler, Router } from 'express';
import {
  createChatRoom,
  getUserChatRooms,
  getChatRoom,
  sendMessage,
  createOrGetDirectChat
} from '../controllers/chat.controller';
import authMiddleware from '../middlewares/auth';
import { textModerationMiddleware } from '../middlewares/contentModeration';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware as RequestHandler);

// Rotas de chat
router.post('/rooms', createChatRoom as RequestHandler);
router.get('/rooms', getUserChatRooms as RequestHandler);
router.get('/rooms/:id', getChatRoom as RequestHandler);
router.post('/rooms/:id/messages', textModerationMiddleware as RequestHandler, sendMessage as RequestHandler);
router.get('/direct/:targetUserId', createOrGetDirectChat as RequestHandler);

export default router;