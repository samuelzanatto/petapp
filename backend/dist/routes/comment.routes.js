"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const comment_controller_1 = require("../controllers/comment.controller");
const auth_1 = __importDefault(require("../middlewares/auth"));
const router = (0, express_1.Router)();
// Aplicar middleware de autenticação em todas as rotas
router.use(auth_1.default);
// Rotas de comentários
router.delete('/:commentId', comment_controller_1.deleteComment);
exports.default = router;
