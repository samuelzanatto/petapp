import { RequestHandler, Router } from 'express';
import multer from 'multer';
import {
  createPost,
  getPosts,
  getPostsByUser,
  getPostById,
  likePost,
  commentOnPost,
  getPostComments,
  deletePost
} from '../controllers/post.controller';
import authMiddleware from '../middlewares/auth';
import { textModerationMiddleware, imageModerationMiddleware } from '../middlewares/contentModeration';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware as RequestHandler);

// Rotas de posts
router.post('/', textModerationMiddleware as RequestHandler, imageModerationMiddleware as RequestHandler, createPost as RequestHandler);
router.get('/', getPosts as RequestHandler);
router.get('/user/:userId', getPostsByUser as RequestHandler);
router.get('/:id', getPostById as RequestHandler);
router.post('/:id/like', likePost as RequestHandler);
router.post('/:id/comments', textModerationMiddleware as RequestHandler, commentOnPost as RequestHandler);
router.get('/:id/comments', getPostComments as RequestHandler);
router.delete('/:id', deletePost as RequestHandler);

export default router;