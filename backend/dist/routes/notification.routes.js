"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_1 = __importDefault(require("../middlewares/auth"));
const router = (0, express_1.Router)();
// Aplicar middleware de autenticação em todas as rotas
router.use(auth_1.default);
// Rotas para tokens de dispositivos
router.post('/push-token', notification_controller_1.registerDeviceToken);
router.delete('/push-token', notification_controller_1.removeDeviceToken);
// Rotas para notificações
router.get('/', notification_controller_1.getUserNotifications);
router.get('/unread-count', notification_controller_1.countUnreadNotifications);
router.put('/:id/read', notification_controller_1.markNotificationAsRead);
router.put('/read-all', notification_controller_1.markAllNotificationsAsRead);
router.delete('/:id', notification_controller_1.deleteNotification);
router.delete('/', notification_controller_1.deleteAllNotifications);
exports.default = router;
