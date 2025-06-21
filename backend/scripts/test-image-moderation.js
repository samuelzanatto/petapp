/**
 * Script para testar a funcionalidade de moderação de imagens
 * 
 * Este script testa apenas a moderação de imagem usando o Google Cloud Vision API
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { resolve } = require('path');

// Carregar variáveis de ambiente com caminho explícito para o arquivo .env
dotenv.config({ path: resolve(__dirname, '../.env') });

// Importar serviço de moderação após carregar as variáveis de ambiente
const { moderateImage } = require('../src/services/contentModeration');

// Caminho para pasta de imagens de teste
const testImagesDir = path.join(__dirname, 'test-images');

// Verificar se a pasta de imagens de teste existe
if (!fs.existsSync(testImagesDir)) {
  fs.mkdirSync(testImagesDir, { recursive: true });
  console.log(`Pasta de imagens de teste criada em: ${testImagesDir}`);
  console.log('Por favor, adicione imagens de teste na pasta antes de executar o script novamente.');
  process.exit(0);
}

// Obter lista de imagens de teste
const imageFiles = fs.readdirSync(testImagesDir)
  .filter(file => ['.jpg', '.jpeg', '.png'].includes(path.extname(file).toLowerCase()))
  .map(file => path.join(testImagesDir, file));

if (imageFiles.length === 0) {
  console.log('Nenhuma imagem encontrada na pasta de teste.');
  console.log(`Por favor, adicione imagens .jpg, .jpeg ou .png em: ${testImagesDir}`);
  process.exit(0);
}

// Função para testar moderação de imagem
async function testImageModeration() {
  console.log('\n===== TESTE DE MODERAÇÃO DE IMAGEM =====\n');
  
  for (const imagePath of imageFiles) {
    const fileName = path.basename(imagePath);
    console.log(`Testando imagem: ${fileName}`);
    
    try {
      const result = await moderateImage(imagePath);
      
      console.log(`Resultado: ${result.isFlagged ? 'REJEITADO' : 'APROVADO'}`);
      
      if (result.unsafeContent) {
        console.log('Conteúdo inadequado detectado:');
        Object.entries(result.unsafeContent)
          .filter(([_, value]) => value === true)
          .forEach(([key, _]) => console.log(`  - ${key}`));
      }
      
      if (result.safetyScores) {
        console.log('Pontuações de segurança:');
        Object.entries(result.safetyScores)
          .sort((a, b) => b[1] - a[1])
          .forEach(([key, value]) => console.log(`  - ${key}: ${value}`));
      }
      
      // Verificar se houve erro no processo
      if (!result.success) {
        console.log('⚠️ AVISO: A moderação não foi bem-sucedida:');
        console.log(`  - ${result.message}`);
      }
      
    } catch (error) {
      console.error('Erro ao moderar imagem:', error);
    }
    
    console.log('-'.repeat(50));
  }
}

// Função principal
async function main() {
  console.log('Iniciando testes de moderação de imagem...\n');
    // Verificar se a chave da API está configurada
  if (!process.env.GOOGLE_API_KEY) {
    console.error('\n⚠️ ERRO: A variável GOOGLE_API_KEY não está configurada no arquivo .env');
    console.log('Por favor, configure a chave da API do Google Vision para usar a moderação de imagens.');
    console.log('Instruções:');
    console.log('1. Obtenha uma chave da API do Google Cloud Vision');
    console.log('2. Adicione a seguinte linha ao arquivo .env:');
    console.log('   GOOGLE_API_KEY=sua_chave_aqui');
    process.exit(1);
  } else {
    console.log('✅ GOOGLE_API_KEY configurada corretamente');
  }
  
  // Testar moderação de imagem
  await testImageModeration();
  
  console.log('\nTestes de moderação de imagem concluídos!');
}

// Executar o script
main().catch(error => {
  console.error('Erro ao executar testes de moderação de imagem:', error);
  process.exit(1);
});
