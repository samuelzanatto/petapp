# Guia de Implantação do PetApp Backend

Este documento fornece instruções para implantar o backend do PetApp em um servidor externo usando Docker.

## Pré-requisitos no Servidor

- Docker instalado (versão 20.10+)
- Docker Compose instalado (versão 2.0+)
- Pelo menos 2GB de RAM disponíveis
- Pelo menos 10GB de espaço em disco
- Acesso à internet para baixar imagens Docker

## Arquivos Necessários

Para implantar o backend, você precisará dos seguintes arquivos:

1. Imagem Docker do backend (`petapp-backend:latest`)
2. Arquivo `docker-compose.yml`
3. Arquivo `.env` com configurações de produção
4. Diretório `credentials/` com os arquivos:
   - `firebase-service-account.json`
   - `google-cloud-vision.json` (se aplicável)

## Opções de Implantação

### Opção 1: Usando Registro Docker

Se você enviou a imagem para um registro Docker (como Docker Hub ou outro registro privado):

1. Faça login no registro (se for privado):
   ```
   docker login seu-registro
   ```

2. Crie um diretório para o projeto no servidor:
   ```
   mkdir -p /opt/petapp-backend
   cd /opt/petapp-backend
   ```

3. Copie o arquivo `docker-compose.yml` e `.env` para o servidor:
   ```
   # Localmente
   scp docker-compose.yml .env.production usuario@seu-servidor:/opt/petapp-backend/
   scp -r credentials usuario@seu-servidor:/opt/petapp-backend/
   
   # No servidor
   mv .env.production .env
   ```

4. Inicie os contêineres:
   ```
   docker-compose up -d
   ```

### Opção 2: Usando Arquivo de Imagem

Se você prefere exportar a imagem como um arquivo e importá-la diretamente:

1. Exporte a imagem localmente:
   ```
   docker save -o petapp-backend.tar petapp-backend:latest
   ```

2. Transfira o arquivo para o servidor:
   ```
   scp petapp-backend.tar usuario@seu-servidor:/tmp/
   ```

3. No servidor, importe a imagem:
   ```
   docker load -i /tmp/petapp-backend.tar
   ```

4. Siga os passos 2-4 da Opção 1 acima.

## Verificando a Instalação

Após a implantação, verifique se tudo está funcionando corretamente:

1. Verifique se os contêineres estão em execução:
   ```
   docker-compose ps
   ```

2. Verifique os logs para detectar erros:
   ```
   docker-compose logs -f
   ```

3. Teste o endpoint de verificação de saúde da API:
   ```
   curl http://localhost:3000/api/health
   ```

## Solução de Problemas

- **Problemas de permissão de arquivos**:
  Certifique-se de que os diretórios de volumes têm as permissões corretas:
  ```
  chmod -R 755 /opt/petapp-backend/credentials
  ```

- **Banco de dados não inicia**:
  Verifique se as variáveis de ambiente estão configuradas corretamente no arquivo `.env`.

- **Backend não se conecta ao banco de dados**:
  Verifique se a variável `DATABASE_URL` está configurada corretamente para apontar para o serviço `postgres` definido no docker-compose.

- **Falha na migração do Prisma**:
  Execute manualmente:
  ```
  docker-compose exec backend npx prisma migrate deploy
  ```

## Backup e Manutenção

- **Backup do banco de dados**:
  ```
  docker-compose exec postgres pg_dump -U petapp petapp > backup_$(date +%Y%m%d).sql
  ```

- **Atualização da aplicação**:
  ```
  # Parar contêineres
  docker-compose down
  
  # Atualizar imagem
  docker pull seu-usuario/petapp-backend:latest
  
  # Reiniciar contêineres
  docker-compose up -d
  ```

## Segurança

- Recomenda-se configurar um proxy reverso (como Nginx) na frente da API para adicionar HTTPS.
- Configure corretamente as senhas e segredos no arquivo `.env`.
- Nunca exponha a porta do PostgreSQL (5432) diretamente à internet.

## Monitoramento

Recomenda-se usar uma solução de monitoramento como:
- Prometheus + Grafana
- Datadog
- New Relic

## Suporte

Para mais informações ou suporte, entre em contato com a equipe de desenvolvimento do PetApp.
