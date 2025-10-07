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
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const os = __importStar(require("os"));
// Configurações da aplicação
class Config {
    constructor() {
        // Usar variável de ambiente, ou calcular baseado no IP local
        this._apiUrl = process.env.API_URL || this.getLocalApiUrl();
        // Inicializar configurações do Firebase
        this._firebase = {
            serverKey: process.env.FIREBASE_SERVER_KEY || '',
            projectId: process.env.FIREBASE_PROJECT_ID || 'petapp-9e317',
        };
        // Inicializar configurações do Supabase
        this._supabase = {
            url: process.env.SUPABASE_URL || '',
            anonKey: process.env.SUPABASE_ANON_KEY || '',
        };
        console.log(`Inicializando API com URL base: ${this._apiUrl}`);
    }
    // Obter URL da API usando o IP local
    getLocalApiUrl() {
        // Obter interfaces de rede disponíveis
        const interfaces = os.networkInterfaces();
        let ipAddress = '127.0.0.1'; // Padrão para localhost
        // Iterar sobre todas as interfaces de rede
        Object.keys(interfaces).forEach((interfaceName) => {
            const networkInterface = interfaces[interfaceName];
            if (networkInterface) {
                // Filtrar por interfaces IPv4 que não sejam localhost e não sejam internos
                networkInterface.forEach((info) => {
                    if (info.family === 'IPv4' && !info.internal && info.address.startsWith('192.168.')) {
                        ipAddress = info.address;
                    }
                });
            }
        });
        // Porta padrão do servidor
        const port = process.env.PORT || 3000;
        return `http://${ipAddress}:${port}`;
    }
    // Getter para a URL da API
    get apiUrl() {
        return this._apiUrl;
    }
    // URL base sem o caminho da API
    get baseUrl() {
        return this._apiUrl;
    }
    // Getter para as configurações do Firebase
    get firebase() {
        return this._firebase;
    }
    // Getter para as configurações do Supabase
    get supabase() {
        return this._supabase;
    }
}
// Exportar uma instância única de configuração (singleton)
exports.config = new Config();
