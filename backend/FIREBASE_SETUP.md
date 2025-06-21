# Configuração do Firebase Cloud Messaging (FCM) v1

## Introdução

Este guia explica como configurar o Firebase Cloud Messaging (FCM) v1 para enviar notificações push no PetApp.

A partir de julho de 2024, o Google está desativando a API legada do FCM, que usava `Server Keys` para autenticação. A nova API HTTP v1 usa autenticação OAuth2 com credenciais de conta de serviço.

## Passos para Configuração

### 1. Obtenha o arquivo de credenciais do Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione seu projeto: `petapp-9e317`
3. Clique na engrenagem (Configurações) > Configurações do projeto
4. Vá para a aba "Contas de serviço"
5. Selecione "Firebase Admin SDK"
6. Clique em "Gerar nova chave privada"
7. Salve o arquivo JSON baixado

### 2. Configure as credenciais no backend

Execute o script de configuração que criamos:

```powershell
cd h:\PetApp\backend
node scripts\setup-firebase-credentials.js
```

Siga as instruções do script para configurar corretamente as credenciais.

### 3. Verifique o arquivo `.env`

Abra o arquivo `h:\PetApp\backend\.env` e verifique se as seguintes variáveis estão configuradas:

```
FIREBASE_PROJECT_ID="petapp-9e317"
FIREBASE_SERVICE_ACCOUNT_PATH="credentials/firebase-service-account.json"
```

O caminho deve apontar para onde o arquivo de credenciais foi salvo.

### 4. Reinicie o servidor backend

```powershell
cd h:\PetApp\backend
npm run dev
```

## Sobre a Migração do FCM

A nova API HTTP v1 do FCM traz várias melhorias:

1. **Melhor segurança**: Usa tokens OAuth2 de curta duração em vez de chaves de servidor estáticas
2. **Personalização por plataforma**: Permite estruturar mensagens diferentes para Android e iOS em uma única requisição
3. **Formato mais claro**: A estrutura da mensagem é mais organizada e explícita

## Testando Notificações

Para testar as notificações, você pode:

1. Seguir um usuário (isso deve enviar uma notificação de novo seguidor)
2. Comentar em uma postagem (isso deve enviar uma notificação ao autor da postagem)

## Solução de Problemas

Se encontrar problemas:

1. Verifique os logs do servidor para mensagens de erro específicas
2. Confirme que o arquivo de credenciais está correto e acessível
3. Verifique se o Firebase Admin SDK está inicializando corretamente

## Recursos Adicionais

- [Documentação do Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Migração para a API HTTP v1](https://firebase.google.com/docs/cloud-messaging/migrate-v1)
- [Documentação do Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
