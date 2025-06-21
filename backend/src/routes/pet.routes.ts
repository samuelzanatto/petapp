import { RequestHandler, Router } from 'express';
import multer from 'multer';
import { createPet, getUserPets, getPetById, updatePet, deletePet, getAllPets } from '../controllers/pet.controller';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/pets');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware as RequestHandler);

// Rotas de pets
router.post('/', upload.single('image'), createPet as RequestHandler);
router.get('/', getUserPets as RequestHandler);
router.get('/all', getAllPets as RequestHandler);
router.get('/:id', getPetById as RequestHandler);
// Alterado para aceitar o campo 'images' em vez de 'image'
router.put('/:id', upload.array('images', 5), updatePet as RequestHandler);
router.delete('/:id', deletePet as RequestHandler);

export default router;