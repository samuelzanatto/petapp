"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const alert_controller_1 = require("../controllers/alert.controller");
const alert_sightings_controller_1 = require("../controllers/alert.sightings.controller");
const pet_sightings_controller_1 = require("../controllers/pet.sightings.controller");
const auth_1 = __importDefault(require("../middlewares/auth"));
const router = (0, express_1.Router)();
// Configuração do Multer para upload de imagens
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/alerts');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});
const upload = (0, multer_1.default)({ storage });
// Aplicar middleware de autenticação em todas as rotas
router.use(auth_1.default);
// Rotas de alertas
router.post('/found', upload.single('image'), alert_controller_1.reportFoundPet);
router.get('/lost', alert_controller_1.getLostPets);
router.get('/lost/:id', alert_controller_1.getLostPetAlertById);
router.get('/found', alert_controller_1.getFoundPets);
router.post('/lost', upload.array('images', 5), alert_controller_1.reportLostPet);
router.post('/sightings', upload.single('image'), alert_sightings_controller_1.reportPetSighting);
router.get('/search', alert_controller_1.searchPetsByRadius);
// Novas rotas para avistamentos
router.get('/lost/:id/sightings', pet_sightings_controller_1.getPetSightings);
router.get('/sightings/:id', pet_sightings_controller_1.getSightingDetails);
exports.default = router;
