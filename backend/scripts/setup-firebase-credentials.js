#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Criar interface para receber input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('='.repeat(80));
console.log('CONFIGURAÇÃO DE CREDENCIAIS DO FIREBASE');
console.log('='.repeat(80));
console.log('\nEste script ajudará você a configurar as credenciais necessárias para o Firebase Cloud Messaging.\n');
console.log('PASSOS PARA OBTER SEU ARQUIVO DE CREDENCIAIS DO FIREBASE:');
console.log('1. Acesse o console do Firebase: https://console.firebase.google.com/');
console.log('2. Selecione seu projeto: petapp-9e317');
console.log('3. Vá para Configurações do Projeto > Contas de serviço');
console.log('4. Clique em "Gerar nova chave privada"');
console.log('5. Salve o arquivo JSON baixado');

rl.question('\nDigite o caminho completo para o arquivo de credenciais JSON baixado: ', (filePath) => {
  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      console.error(`Erro: O arquivo ${filePath} não existe.`);
      process.exit(1);
    }

    // Verificar se é um arquivo JSON válido
    const serviceAccount = require(filePath);
    
    if (!serviceAccount.type || !serviceAccount.project_id || !serviceAccount.private_key) {
      console.error('Erro: O arquivo não parece ser um arquivo de credenciais válido do Firebase.');
      process.exit(1);
    }

    // Diretório onde o arquivo será copiado
    const targetDir = path.join(__dirname, '..', 'credentials');
    
    // Criar diretório se não existir
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copiar o arquivo
    const targetPath = path.join(targetDir, 'firebase-service-account.json');
    fs.copyFileSync(filePath, targetPath);

    // Atualizar o arquivo .env
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    
    // Verificar se o arquivo .env existe
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Adicionar ou atualizar a variável FIREBASE_SERVICE_ACCOUNT_PATH
    const relativePath = path.relative(path.join(__dirname, '..'), targetPath).replace(/\\/g, '/');
    const envVar = `FIREBASE_SERVICE_ACCOUNT_PATH="${relativePath}"`;
    
    if (envContent.includes('FIREBASE_SERVICE_ACCOUNT_PATH=')) {
      // Substituir linha existente
      envContent = envContent.replace(/FIREBASE_SERVICE_ACCOUNT_PATH=.*$/m, envVar);
    } else {
      // Adicionar nova linha
      envContent += `\n${envVar}`;
    }

    // Adicionar projeto ID se não existir
    if (!envContent.includes('FIREBASE_PROJECT_ID=')) {
      envContent += `\nFIREBASE_PROJECT_ID="${serviceAccount.project_id}"`;
    }

    // Salvar arquivo .env atualizado
    fs.writeFileSync(envPath, envContent);

    console.log('\nConfigurações realizadas com sucesso!');
    console.log(`Arquivo de credenciais copiado para: ${targetPath}`);
    console.log(`Arquivo .env atualizado com as variáveis necessárias.`);
    console.log('\nAgora você pode executar seu servidor com notificações push funcionando corretamente.');

  } catch (error) {
    console.error('Erro ao configurar credenciais:', error);
  } finally {
    rl.close();
  }
});