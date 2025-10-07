"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const pet_controller_1 = require("../controllers/pet.controller");
const auth_1 = __importDefault(require("../middlewares/auth"));
const router = (0, express_1.Router)();
// Configuração do Multer para upload de imagens
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/pets');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});
const upload = (0, multer_1.default)({ storage });
// Aplicar middleware de autenticação em todas as rotas
router.use(auth_1.default);
// Rotas de pets
router.post('/', upload.single('image'), pet_controller_1.createPet);
router.get('/', pet_controller_1.getUserPets);
router.get('/all', pet_controller_1.getAllPets);
router.get('/:id', pet_controller_1.getPetById);
// Alterado para aceitar o campo 'images' em vez de 'image'
router.put('/:id', upload.array('images', 5), pet_controller_1.updatePet);
router.delete('/:id', pet_controller_1.deletePet);
exports.default = router;
