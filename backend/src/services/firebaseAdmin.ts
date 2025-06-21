import * as admin from 'firebase-admin';
import { JWT } from 'google-auth-library';
import axios from 'axios';
import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env na raiz do backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Inicializar o Firebase Admin SDK
let app: admin.app.App;

const initializeFirebaseAdmin = () => {
  try {
    if (admin.apps.length === 0) {
      // Determinar caminho para o arquivo de credenciais da conta de serviço
      let serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      // Fallback para arquivo padrão em backend/credentials
      if (!serviceAccountPath) {
        const defaultPath = path.resolve(__dirname, '../../credentials/firebase-service-account.json');
        if (fs.existsSync(defaultPath)) {
          serviceAccountPath = defaultPath;
          process.env.FIREBASE_SERVICE_ACCOUNT_PATH = defaultPath;
        }
      }
       
      if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        // Inicializar com arquivo de conta de serviço local
        const serviceAccount = require(serviceAccountPath);
        app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: config.firebase.projectId
        });
        console.log('Firebase Admin SDK inicializado com credenciais de serviço local:', serviceAccountPath);
      } else {
        // Sem credenciais locais, abortar para evitar erro de ADC
        throw new Error('Arquivo de credenciais do Firebase não encontrado. Defina FIREBASE_SERVICE_ACCOUNT_PATH ou coloque o JSON em backend/credentials.');
      }
    } else {
      app = admin.app();
    }
    
    return app;
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin SDK:', error);
    throw error;
  }
};

// Obter token de acesso OAuth 2.0 para FCM
const getAccessToken = async () => {
  try {
    // Verificar se o Firebase Admin SDK está inicializado
    if (admin.apps.length === 0) {
      initializeFirebaseAdmin();
    }
    
    // Obter token de acesso do SDK Admin
    const accessToken = await admin.app().options.credential?.getAccessToken();
    return accessToken?.access_token;
  } catch (error) {
    console.error('Erro ao obter token de acesso:', error);
    throw error;
  }
};

// Enviar mensagem usando FCM HTTP v1 API
export const sendFcmMessage = async (message: any) => {
  try {
    // Obter o token de acesso
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      throw new Error('Não foi possível obter o token de acesso');
    }
    
    // Montar a mensagem no formato FCM v1
    const messagePayload = {
      message: message
    };
    console.debug('FCM payload:', JSON.stringify(messagePayload));
    
    // Enviar a mensagem usando a API HTTP v1
    const response = await axios.post(
      `https://fcm.googleapis.com/v1/projects/${config.firebase.projectId}/messages:send`,
      messagePayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    // Se for erro do Axios, logar resposta detalhada
    if (error.response && error.response.data) {
      console.error('Erro FCM v1 response data:', JSON.stringify(error.response.data));
    }
    console.error('Erro ao enviar mensagem via FCM v1:', error.message || error);
    throw error;
  }
};

// Inicializar o Firebase Admin SDK quando o módulo for carregado
initializeFirebaseAdmin();

export default {
  sendFcmMessage,
  getAccessToken,
  app: () => app
};