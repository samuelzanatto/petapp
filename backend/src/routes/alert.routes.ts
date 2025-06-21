import { RequestHandler, Router } from 'express';
import multer from 'multer';
import { 
  reportLostPet, 
  reportFoundPet, 
  getLostPets, 
  getFoundPets, 
  getLostPetAlertById,
  searchPetsByRadius,
} from '../controllers/alert.controller';
import { reportPetSighting } from '../controllers/alert.sightings.controller';
import { getPetSightings, getSightingDetails } from '../controllers/pet.sightings.controller';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/alerts');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware as RequestHandler);

// Rotas de alertas
router.post('/found', upload.single('image'), reportFoundPet as RequestHandler);
router.get('/lost', getLostPets as RequestHandler);
router.get('/lost/:id', getLostPetAlertById as RequestHandler);
router.get('/found', getFoundPets as RequestHandler);
router.post('/lost', upload.array('images', 5), reportLostPet as RequestHandler);
router.post('/sightings', upload.single('image'), reportPetSighting as RequestHandler);
router.get('/search', searchPetsByRadius as RequestHandler);

// Novas rotas para avistamentos
router.get('/lost/:id/sightings', getPetSightings as RequestHandler);
router.get('/sightings/:id', getSightingDetails as RequestHandler);

export default router;