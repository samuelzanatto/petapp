"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFcmMessage = void 0;
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Carregar variáveis de ambiente do arquivo .env na raiz do backend
dotenv_1.default.config({ path: path.resolve(__dirname, '../../.env') });
// Inicializar o Firebase Admin SDK
let app;
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
                    projectId: config_1.config.firebase.projectId
                });
                console.log('Firebase Admin SDK inicializado com credenciais de serviço local:', serviceAccountPath);
            }
            else {
                // Sem credenciais locais, abortar para evitar erro de ADC
                throw new Error('Arquivo de credenciais do Firebase não encontrado. Defina FIREBASE_SERVICE_ACCOUNT_PATH ou coloque o JSON em backend/credentials.');
            }
        }
        else {
            app = admin.app();
        }
        return app;
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Erro ao obter token de acesso:', error);
        throw error;
    }
};
// Enviar mensagem usando FCM HTTP v1 API
const sendFcmMessage = async (message) => {
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
        const response = await axios_1.default.post(`https://fcm.googleapis.com/v1/projects/${config_1.config.firebase.projectId}/messages:send`, messagePayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
    catch (error) {
        // Se for erro do Axios, logar resposta detalhada
        if (error.response && error.response.data) {
            console.error('Erro FCM v1 response data:', JSON.stringify(error.response.data));
        }
        console.error('Erro ao enviar mensagem via FCM v1:', error.message || error);
        throw error;
    }
};
exports.sendFcmMessage = sendFcmMessage;
// Inicializar o Firebase Admin SDK quando o módulo for carregado
initializeFirebaseAdmin();
exports.default = {
    sendFcmMessage: exports.sendFcmMessage,
    getAccessToken,
    app: () => app
};
