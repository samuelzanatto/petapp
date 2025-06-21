#!/usr/bin/env node

// Script para testar a configuração do Firebase Cloud Messaging
require('dotenv').config();
const { sendFcmMessage } = require('../src/services/firebaseAdmin');

async function testFCMConfiguration() {
  console.log('='.repeat(80));
  console.log('TESTE DE CONFIGURAÇÃO DO FIREBASE CLOUD MESSAGING');
  console.log('='.repeat(80));
  
  try {
    console.log('Verificando configuração do Firebase Admin SDK...');
    
    // Verificar se o projeto ID está definido
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID não está definido no arquivo .env');
    }
    console.log(`✅ FIREBASE_PROJECT_ID configurado: ${projectId}`);
    
    // Verificar se o caminho do arquivo de credenciais está definido
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!serviceAccountPath) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH não está definido no arquivo .env');
    }
    console.log(`✅ FIREBASE_SERVICE_ACCOUNT_PATH configurado: ${serviceAccountPath}`);
    
    // Tentar obter um token de acesso (isso testará se as credenciais estão funcionando)
    console.log('Obtendo token de acesso OAuth 2.0...');
    const admin = require('../src/services/firebaseAdmin').default;
    const accessToken = await admin.getAccessToken();
    
    if (!accessToken) {
      throw new Error('Não foi possível obter um token de acesso. Verifique suas credenciais.');
    }
    console.log(`✅ Token de acesso obtido com sucesso!`);
    
    console.log('\nTodos os testes passaram! Sua configuração do Firebase está correta.');
    console.log('\nPróximos passos:');
    console.log('1. Reinicie o servidor backend para aplicar as alterações');
    console.log('2. Teste enviar uma notificação seguindo um usuário ou comentando em um post');
    
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    console.error('\nDicas para solução de problemas:');
    console.error('1. Verifique se o arquivo de credenciais existe e é válido');
    console.error('2. Certifique-se de que o projeto ID está correto');
    console.error('3. Execute o script setup-firebase-credentials.js novamente');
    
    if (error.stack) {
      console.error('\nDetalhes do erro:');
      console.error(error.stack);
    }
  }
}

testFCMConfiguration();
