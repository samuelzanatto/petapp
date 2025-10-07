"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = __importDefault(require("../middlewares/auth"));
const router = (0, express_1.Router)();
// Configuração do Multer para upload de imagens de perfil
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/users');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});
const upload = (0, multer_1.default)({ storage });
// Aplicar middleware de autenticação em todas as rotas
router.use(auth_1.default);
// Rota para o perfil do usuário logado
router.get('/profile/me', user_controller_1.getMyProfile);
// Rotas de usuários
router.get('/profile/:id', user_controller_1.getUserProfile);
router.put('/profile', upload.single('profileImage'), user_controller_1.updateUserProfile);
router.put('/location', user_controller_1.updateUserLocation);
router.put('/password', user_controller_1.changePassword);
router.post('/follow/:id', user_controller_1.followUser);
router.get('/followers/:id', user_controller_1.getFollowers);
router.get('/following/:id', user_controller_1.getFollowing);
router.get('/search', user_controller_1.searchUsers);
router.get('/:id/pets', user_controller_1.getUserPets);
router.get('/discover', user_controller_1.discoverUsers);
router.delete('/account', user_controller_1.deleteAccount);
exports.default = router;
