/**
 * Script para testar a funcionalidade de moderação de conteúdo
 * 
 * Este script testa tanto a moderação de texto quanto a de imagem
 * usando o Google Cloud Vision e OpenAI APIs
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { resolve } = require('path');

// Carregar variáveis de ambiente com caminho explícito para o arquivo .env
dotenv.config({ path: resolve(__dirname, '../.env') });

// Importar serviços de moderação após carregar as variáveis de ambiente
const { moderateText, moderateImage } = require('../src/services/contentModeration');

// Amostras de texto para teste
const textSamples = [
  {
    description: 'Texto normal',
    text: 'Este é um texto normal sobre pets. Adoro meu cachorro e ele é muito fofo!'
  },
  {
    description: 'Texto com palavrões em português',
    text: 'Que merda é essa? Esse cachorro é do caralho!'
  },
  {
    description: 'Texto com palavrões em inglês',
    text: 'This dog is fucking awesome! I love this shit.'
  },
  {
    description: 'Texto com ameaças',
    text: 'Vou te encontrar e machucar seu animal de estimação se você não me devolver meu dinheiro.'
  },
  {
    description: 'Texto com conteúdo sexual',
    text: 'O cachorro da vizinha fica olhando enquanto transamos no quintal.'
  }
];

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
}

// Função para testar moderação de texto
async function testTextModeration() {
  console.log('\n===== TESTE DE MODERAÇÃO DE TEXTO =====\n');
  
  for (const sample of textSamples) {
    console.log(`Testando: "${sample.description}"`);
    console.log(`Texto: "${sample.text}"`);
    
    try {
      const result = await moderateText(sample.text);
      
      console.log(`Resultado: ${result.isFlagged ? 'REJEITADO' : 'APROVADO'}`);
      
      if (result.categories) {
        console.log('Categorias detectadas:');
        Object.entries(result.categories)
          .filter(([_, value]) => value === true)
          .forEach(([key, _]) => console.log(`  - ${key}`));
      }
      
      if (result.categoryScores) {
        console.log('Pontuações:');
        Object.entries(result.categoryScores)
          .filter(([_, value]) => value > 0.01)
          .sort((a, b) => b[1] - a[1])
          .forEach(([key, value]) => console.log(`  - ${key}: ${value.toFixed(4)}`));
      }
      
    } catch (error) {
      console.error('Erro ao moderar texto:', error);
    }
    
    console.log('-'.repeat(50));
  }
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
      
    } catch (error) {
      console.error('Erro ao moderar imagem:', error);
    }
    
    console.log('-'.repeat(50));
  }
}

// Função principal
async function main() {
  console.log('Iniciando testes de moderação de conteúdo...\n');
  
  // Testar moderação de texto
  await testTextModeration();
  
  // Testar moderação de imagem (se houver imagens)
  if (imageFiles.length > 0) {
    await testImageModeration();
  }
  
  console.log('\nTestes de moderação concluídos!');
}

// Executar o script
main().catch(error => {
  console.error('Erro ao executar testes de moderação:', error);
  process.exit(1);
});
