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
exports.setupUploadFolders = setupUploadFolders;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Função para criar diretórios recursivamente
function createDirIfNotExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Diretório criado: ${dir}`);
    }
}
// Criar diretórios para uploads
function setupUploadFolders() {
    const baseDir = path.join(__dirname, '../../uploads');
    createDirIfNotExists(baseDir);
    createDirIfNotExists(path.join(baseDir, 'pets'));
    createDirIfNotExists(path.join(baseDir, 'users'));
    createDirIfNotExists(path.join(baseDir, 'posts'));
    createDirIfNotExists(path.join(baseDir, 'alerts'));
    createDirIfNotExists(path.join(baseDir, 'claims')); // Novo diretório para imagens de verificação
    console.log('Diretórios de upload configurados com sucesso');
}
// Chamar a função se o script for executado diretamente
if (require.main === module) {
    setupUploadFolders();
}
