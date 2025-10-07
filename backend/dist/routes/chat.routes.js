"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const auth_1 = __importDefault(require("../middlewares/auth"));
const contentModeration_1 = require("../middlewares/contentModeration");
const router = (0, express_1.Router)();
// Aplicar middleware de autenticação em todas as rotas
router.use(auth_1.default);
// Rotas de chat
router.post('/rooms', chat_controller_1.createChatRoom);
router.get('/rooms', chat_controller_1.getUserChatRooms);
router.get('/rooms/:id', chat_controller_1.getChatRoom);
router.post('/rooms/:id/messages', contentModeration_1.textModerationMiddleware, chat_controller_1.sendMessage);
router.get('/direct/:targetUserId', chat_controller_1.createOrGetDirectChat);
exports.default = router;
