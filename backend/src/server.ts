import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { initializeSocketIO } from './services/notifications';
import { setupUploadFolders } from './utils/setupFolders';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import petRoutes from './routes/pet.routes';
import postRoutes from './routes/post.routes';
import alertRoutes from './routes/alert.routes';
import chatRoutes from './routes/chat.routes';
import uploadRoutes from './routes/upload.routes';
import claimRoutes from './routes/claim.routes';
import notificationRoutes from './routes/notification.routes';
import commentRoutes from './routes/comment.routes';
import recoveryRoutes from './routes/recovery.routes';
import moderationRoutes from './routes/moderation.routes';

// Carregar variáveis de ambiente
dotenv.config();

// Configurar diretórios de upload
setupUploadFolders();

// Inicializar aplicativo Express e servidor HTTP
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Inicializar Socket.IO para notificações em tempo real
const io = initializeSocketIO(server);

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Endpoint de verificação de saúde para testar conectividade
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/moderation', moderationRoutes);

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