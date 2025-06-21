/**
 * Script para testar a moderação de imagem após a atualização
 * Este script testa a moderação com ambos os métodos (baseada em arquivo e baseada em buffer)
 */
import * as fs from 'fs';
import * as path from 'path';
import { moderateImage } from '../src/services/contentModeration';
import { moderateImageBuffer } from '../src/services/bufferModeration';

// Definir caminho para imagens de teste
const TEST_IMAGES_DIR = path.join(__dirname, 'test-images');

async function testImageModeration() {
  console.log('=== TESTE DE MODERAÇÃO DE IMAGENS ===');
  console.log('Testando ambos os métodos de moderação (arquivo e buffer)');
  console.log('');
  
  // Verificar se o diretório de imagens de teste existe
  if (!fs.existsSync(TEST_IMAGES_DIR)) {
    console.error(`Diretório de imagens de teste não encontrado: ${TEST_IMAGES_DIR}`);
    console.error('Por favor, crie o diretório e adicione imagens para teste');
    return;
  }
  
  // Obter lista de imagens de teste
  const imageFiles = fs.readdirSync(TEST_IMAGES_DIR)
    .filter(file => ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(path.extname(file).toLowerCase()));
  
  if (imageFiles.length === 0) {
    console.error('Nenhuma imagem de teste encontrada no diretório');
    console.error('Por favor, adicione imagens para teste');
    return;
  }
  
  console.log(`Encontradas ${imageFiles.length} imagens para teste`);
  console.log('');
  
  // Testar cada imagem
  for (const imageFile of imageFiles) {
    const imagePath = path.join(TEST_IMAGES_DIR, imageFile);
    console.log(`Testando imagem: ${imageFile}`);
    
    try {
      // Testar moderação baseada em arquivo
      console.log('1. Testando moderação baseada em arquivo...');
      const fileResult = await moderateImage(imagePath);
      console.log('   Resultado:', fileResult.isFlagged ? 'REJEITADO' : 'APROVADO');
      if (fileResult.isFlagged) {
        console.log('   Conteúdo impróprio:', 
          Object.entries(fileResult.unsafeContent)
            .filter(([_, value]) => value === true)
            .map(([key, _]) => key)
            .join(', ')
        );
      }
      
      // Testar moderação baseada em buffer
      console.log('2. Testando moderação baseada em buffer...');
      // Ler o arquivo como buffer
      const buffer = fs.readFileSync(imagePath);
      // Determinar MIME type com base na extensão
      const ext = path.extname(imageFile).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      if (ext === '.gif') mimeType = 'image/gif';
      if (ext === '.webp') mimeType = 'image/webp';
      
      const bufferResult = await moderateImageBuffer(buffer, mimeType);
      console.log('   Resultado:', bufferResult.isFlagged ? 'REJEITADO' : 'APROVADO');
      if (bufferResult.isFlagged) {
        console.log('   Conteúdo impróprio:', 
          Object.entries(bufferResult.unsafeContent)
            .filter(([_, value]) => value === true)
            .map(([key, _]) => key)
            .join(', ')
        );
      }
      
      // Comparar resultados
      if (fileResult.isFlagged === bufferResult.isFlagged) {
        console.log('✅ Os resultados são consistentes entre os métodos');
      } else {
        console.log('❌ ATENÇÃO: Os resultados são diferentes entre os métodos');
        console.log('   Verificar implementação para garantir consistência');
      }
    } catch (error) {
      console.error(`❌ Erro ao testar imagem ${imageFile}:`, error);
    }
    
    console.log('-----------------------------------');
  }
}

// Executar o teste
testImageModeration()
  .then(() => {
    console.log('Teste concluído!');
  })
  .catch(error => {
    console.error('Erro ao executar teste:', error);
  });
