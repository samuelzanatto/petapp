import { Router, RequestHandler } from 'express';
import multer from 'multer';
import {
  getUserProfile,
  updateUserProfile,
  updateUserLocation,
  changePassword,
  followUser,
  getFollowers,
  getFollowing,
  searchUsers,
  getUserPets,
  deleteAccount,
  discoverUsers,
  getMyProfile
} from '../controllers/user.controller';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Configuração do Multer para upload de imagens de perfil
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/users');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware as RequestHandler);

// Rota para o perfil do usuário logado
router.get('/profile/me', getMyProfile as RequestHandler);

// Rotas de usuários
router.get('/profile/:id', getUserProfile as RequestHandler);
router.put('/profile', upload.single('profileImage'), updateUserProfile as RequestHandler);
router.put('/location', updateUserLocation as RequestHandler);
router.put('/password', changePassword as RequestHandler);
router.post('/follow/:id', followUser as RequestHandler);
router.get('/followers/:id', getFollowers as RequestHandler);
router.get('/following/:id', getFollowing as RequestHandler);
router.get('/search', searchUsers as RequestHandler);
router.get('/:id/pets', getUserPets as RequestHandler);
router.get('/discover', discoverUsers as RequestHandler);
router.delete('/account', deleteAccount as RequestHandler);

export default router;