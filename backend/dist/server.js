"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const notifications_1 = require("./services/notifications");
const setupFolders_1 = require("./utils/setupFolders");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const pet_routes_1 = __importDefault(require("./routes/pet.routes"));
const post_routes_1 = __importDefault(require("./routes/post.routes"));
const alert_routes_1 = __importDefault(require("./routes/alert.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const claim_routes_1 = __importDefault(require("./routes/claim.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const comment_routes_1 = __importDefault(require("./routes/comment.routes"));
const recovery_routes_1 = __importDefault(require("./routes/recovery.routes"));
const moderation_routes_1 = __importDefault(require("./routes/moderation.routes"));
// Carregar variáveis de ambiente
dotenv_1.default.config();
// Configurar diretórios de upload
(0, setupFolders_1.setupUploadFolders)();
// Inicializar aplicativo Express e servidor HTTP
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 3000;
// Inicializar Socket.IO para notificações em tempo real
const io = (0, notifications_1.initializeSocketIO)(server);
// Middlewares
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Servir arquivos estáticos de uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Endpoint de verificação de saúde para testar conectividade
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Rotas
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/pets', pet_routes_1.default);
app.use('/api/posts', post_routes_1.default);
app.use('/api/alerts', alert_routes_1.default);
app.use('/api/chat', chat_routes_1.default);
app.use('/api/upload', upload_routes_1.default);
app.use('/api/claims', claim_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/comments', comment_routes_1.default);
app.use('/api/recovery', recovery_routes_1.default);
app.use('/api/moderation', moderation_routes_1.default);
// Rota de verificação de saúde
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Servidor funcionando corretamente' });
});
// Iniciar servidor
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
    console.log(`Socket.IO: ws://localhost:${PORT}`);
});
// Lidar com erros não tratados
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});
