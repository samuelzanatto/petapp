"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const post_controller_1 = require("../controllers/post.controller");
const auth_1 = __importDefault(require("../middlewares/auth"));
const contentModeration_1 = require("../middlewares/contentModeration");
const router = (0, express_1.Router)();
// Aplicar middleware de autenticação em todas as rotas
router.use(auth_1.default);
// Rotas de posts
router.post('/', contentModeration_1.textModerationMiddleware, contentModeration_1.imageModerationMiddleware, post_controller_1.createPost);
router.get('/', post_controller_1.getPosts);
router.get('/user/:userId', post_controller_1.getPostsByUser);
router.get('/:id', post_controller_1.getPostById);
router.post('/:id/like', post_controller_1.likePost);
router.post('/:id/comments', contentModeration_1.textModerationMiddleware, post_controller_1.commentOnPost);
router.get('/:id/comments', post_controller_1.getPostComments);
router.delete('/:id', post_controller_1.deletePost);
exports.default = router;
