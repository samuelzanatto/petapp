# Deploy do Backend no AWS Lightsail com Bitnami usando PM2

## 📋 Pré-requisitos

1. Instância AWS Lightsail com Node.js instalado (Bitnami)
2. Acesso SSH à instância
3. Git instalado no servidor
4. Node.js e npm instalados
5. PM2 instalado globalmente no servidor

## 🚀 Passos para Deploy

### 1. Conectar ao Servidor via SSH

**No PowerShell (Windows):**
```powershell
ssh -i C:\aws.pem bitnami@SEU_IP_LIGHTSAIL
```

**Exemplos de Caminhos Comuns:**
```powershell
# Se está na raiz do C:
ssh -i C:\aws.pem bitnami@SEU_IP_LIGHTSAIL

# Se está em uma pasta específica (ex: C:\keys\)
ssh -i C:\keys\aws.pem bitnami@SEU_IP_LIGHTSAIL

# Se está na sua pasta de usuário
ssh -i C:\Users\SeuUsuario\aws.pem bitnami@SEU_IP_LIGHTSAIL
```

**⚠️ Configurar Permissões da Chave (Windows):**

Se receber erro de permissões, execute no PowerShell como Administrador:

```powershell
# Remover herança de permissões
icacls C:\aws.pem /inheritance:r

# Dar permissão apenas para o seu usuário
icacls C:\aws.pem /grant:r "$($env:USERNAME):(R)"
```

**Substitua:**
- `C:\aws.pem` pelo caminho completo da sua chave
- `SEU_IP_LIGHTSAIL` pelo IP público do servidor (ex: 18.234.56.78)

### 2. Instalar PM2 Globalmente (se ainda não instalado)

```bash
sudo npm install -g pm2
```

### 3. Criar Diretório da Aplicação

```bash
sudo mkdir -p /opt/bitnami/apps/petapp
sudo chown -R bitnami:bitnami /opt/bitnami/apps/petapp
cd /opt/bitnami/apps/petapp
```

### 4. Clonar o Repositório

```bash
# Se estiver usando Git
git clone <URL_DO_SEU_REPOSITORIO> .

# Ou fazer upload dos arquivos via SCP/SFTP
```

### 5. Instalar Dependências

```bash
cd /opt/bitnami/apps/petapp/backend
npm install
```

### 6. Configurar Variáveis de Ambiente

```bash
# Copiar o arquivo .env.example para .env
cp .env.example .env

# Editar o arquivo .env com as credenciais de produção
nano .env
```

**Importante**: Configure todas as variáveis necessárias:
- `DATABASE_URL` - URL do banco de dados Supabase
- `DIRECT_URL` - URL direta do banco
- `FIREBASE_SERVICE_ACCOUNT_PATH` - Caminho para credenciais Firebase
- `SUPABASE_URL` - URL do Supabase
- `SUPABASE_ANON_KEY` - Chave anônima do Supabase
- `GEMINI_API_KEY` - Chave do Gemini
- `GOOGLE_API_KEY` - Chave do Google Vision (se usar)
- `JWT_SECRET` - Segredo do JWT
- `NODE_ENV=production`
- `PORT=3000`

### 7. Compilar o TypeScript

```bash
npm run build
```

### 8. Criar Diretório de Logs

```bash
mkdir -p logs
```

### 9. Executar Migrações do Prisma

```bash
npx prisma generate
npx prisma migrate deploy
```

### 10. Iniciar a Aplicação com PM2

```bash
# Iniciar usando o arquivo ecosystem.config.js
pm2 start ecosystem.config.js --env production

# Ou iniciar diretamente (alternativa)
pm2 start dist/server.js --name petapp-backend --env production -i 2
```

### 11. Verificar Status

```bash
# Ver lista de processos
pm2 list

# Ver logs em tempo real
pm2 logs petapp-backend

# Ver informações detalhadas
pm2 show petapp-backend

# Ver monitoramento
pm2 monit
```

### 12. Configurar PM2 para Iniciar no Boot

```bash
# Gerar script de startup
pm2 startup

# Executar o comando que o PM2 mostrar (algo como):
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u bitnami --hp /home/bitnami

# Salvar a lista de processos atual
pm2 save
```

### 13. Configurar Nginx (se necessário)

O Bitnami geralmente vem com Apache ou Nginx. Para configurar um proxy reverso:

```bash
# Editar configuração do Nginx
sudo nano /opt/bitnami/nginx/conf/bitnami/bitnami-apps-prefix.conf
```

Adicionar:
```nginx
location /api {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

Reiniciar Nginx:
```bash
sudo /opt/bitnami/ctlscript.sh restart nginx
```

## 🔄 Comandos Úteis do PM2

### Gerenciamento de Processos

```bash
# Reiniciar a aplicação
pm2 restart petapp-backend

# Recarregar sem downtime (cluster mode)
pm2 reload petapp-backend

# Parar a aplicação
pm2 stop petapp-backend

# Deletar do PM2
pm2 delete petapp-backend

# Reiniciar todos os processos
pm2 restart all
```

### Monitoramento e Logs

```bash
# Ver logs
pm2 logs petapp-backend

# Ver logs de erro
pm2 logs petapp-backend --err

# Limpar logs
pm2 flush

# Monitoramento em tempo real
pm2 monit

# Informações do processo
pm2 describe petapp-backend
```

### Atualização da Aplicação

```bash
# 1. Atualizar código
cd /opt/bitnami/apps/petapp/backend
git pull

# 2. Instalar novas dependências (se houver)
npm install

# 3. Recompilar TypeScript
npm run build

# 4. Executar migrações (se houver)
npx prisma migrate deploy

# 5. Recarregar aplicação (sem downtime)
pm2 reload petapp-backend
```

## 📊 Configuração do ecosystem.config.js

O arquivo `ecosystem.config.js` contém as seguintes configurações:

- **name**: Nome da aplicação no PM2
- **script**: Caminho do arquivo compilado
- **instances**: Número de instâncias (2 para cluster mode)
- **exec_mode**: Modo cluster para balanceamento de carga
- **autorestart**: Reinicia automaticamente se crashar
- **max_memory_restart**: Reinicia se usar mais de 1GB de RAM
- **env_production**: Variáveis de ambiente para produção
- **logs**: Configuração de arquivos de log

## 🔒 Segurança

1. **Firewall**: Certifique-se de que apenas as portas necessárias estão abertas
2. **SSL/TLS**: Configure certificado SSL (use Let's Encrypt com Certbot)
3. **Variáveis de Ambiente**: Nunca commite o arquivo `.env`
4. **Atualizações**: Mantenha o sistema e dependências atualizados

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Atualizar dependências npm
npm audit fix
```

## 🐛 Troubleshooting

### Erro de Permissões

```bash
# Dar permissões corretas
sudo chown -R bitnami:bitnami /opt/bitnami/apps/petapp
chmod -R 755 /opt/bitnami/apps/petapp
```

### Aplicação não Inicia

```bash
# Ver logs de erro
pm2 logs petapp-backend --err

# Verificar se a porta está em uso
sudo netstat -tulpn | grep 3000

# Testar manualmente
NODE_ENV=production node dist/server.js
```

### Memória Alta

```bash
# Ver uso de memória
pm2 monit

# Reduzir número de instâncias
pm2 scale petapp-backend 1
```

### Banco de Dados não Conecta

```bash
# Verificar variáveis de ambiente
pm2 env 0

# Testar conexão manualmente
npx prisma studio
```

## 📝 Checklist de Deploy

- [ ] Código atualizado no servidor
- [ ] Dependências instaladas (`npm install`)
- [ ] TypeScript compilado (`npm run build`)
- [ ] Variáveis de ambiente configuradas (`.env`)
- [ ] Migrações executadas (`prisma migrate deploy`)
- [ ] PM2 iniciado (`pm2 start ecosystem.config.js --env production`)
- [ ] PM2 configurado para startup (`pm2 startup` e `pm2 save`)
- [ ] Nginx configurado (se necessário)
- [ ] SSL/TLS configurado
- [ ] Firewall configurado
- [ ] Logs funcionando
- [ ] Aplicação acessível

## 🔗 Links Úteis

- [Documentação PM2](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Bitnami Node.js Stack](https://docs.bitnami.com/aws/infrastructure/nodejs/)
- [AWS Lightsail Docs](https://docs.aws.amazon.com/lightsail/)

## 💡 Dicas Extras

### Configurar Rotação de Logs

```bash
# Instalar módulo de rotação
pm2 install pm2-logrotate

# Configurar rotação
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Monitoramento Avançado (Opcional)

```bash
# Instalar PM2 Plus para monitoramento web
pm2 link <secret_key> <public_key>
```

### Backup Automático

Crie um script de backup:

```bash
#!/bin/bash
# backup.sh
cd /opt/bitnami/apps/petapp/backend
tar -czf ~/backups/petapp-$(date +%Y%m%d).tar.gz .
```

Configure no crontab:
```bash
crontab -e
# Adicionar: 0 2 * * * /home/bitnami/backup.sh
```

## ✅ Conclusão

Seguindo este guia, sua aplicação PetApp Backend estará rodando em produção no AWS Lightsail com Bitnami, gerenciada pelo PM2, com alta disponibilidade, logs estruturados e reinício automático.
