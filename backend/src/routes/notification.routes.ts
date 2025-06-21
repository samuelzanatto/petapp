import { Router, RequestHandler } from 'express';
import {
  registerDeviceToken,
  removeDeviceToken,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  countUnreadNotifications,
  deleteNotification,
  deleteAllNotifications
} from '../controllers/notification.controller';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware as RequestHandler);

// Rotas para tokens de dispositivos
router.post('/push-token', registerDeviceToken as RequestHandler);
router.delete('/push-token', removeDeviceToken as RequestHandler);

// Rotas para notificações
router.get('/', getUserNotifications as RequestHandler);
router.get('/unread-count', countUnreadNotifications as RequestHandler);
router.put('/:id/read', markNotificationAsRead as RequestHandler);
router.put('/read-all', markAllNotificationsAsRead as RequestHandler);
router.delete('/:id', deleteNotification as RequestHandler);
router.delete('/', deleteAllNotifications as RequestHandler);

export default router;