import * as fs from 'fs';
import * as path from 'path';

// Função para criar diretórios recursivamente
function createDirIfNotExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Diretório criado: ${dir}`);
  }
}

// Criar diretórios para uploads
export function setupUploadFolders() {
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