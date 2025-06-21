#!/bin/bash
# Script para preparar e fazer deploy da aplicação Docker

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Preparando o PetApp Backend para deploy em Docker${NC}"

# Verificar se as credenciais existem
if [ ! -d "./credentials" ]; then
  echo -e "${RED}Diretório de credenciais não encontrado!${NC}"
  echo -e "Criando diretório de credenciais..."
  mkdir -p credentials
  echo -e "${YELLOW}ATENÇÃO: Você precisa adicionar seus arquivos de credenciais em ./credentials antes de continuar.${NC}"
  echo -e "- firebase-service-account.json"
  echo -e "- google-cloud-vision.json (se aplicável)"
  exit 1
fi

# Verificar se o arquivo .env.production existe
if [ ! -f "./.env.production" ]; then
  echo -e "${RED}Arquivo .env.production não encontrado!${NC}"
  echo -e "Por favor, crie o arquivo .env.production com as configurações de produção."
  exit 1
fi

# Compilar a imagem Docker
echo -e "${GREEN}Compilando a imagem Docker...${NC}"
docker build -t petapp-backend:latest .

# Criar arquivo de tag com data
DATE=$(date +%Y%m%d%H%M)
echo "petapp-backend:$DATE" > ./latest-tag.txt

# Atualizar tag com data
echo -e "${GREEN}Adicionando tag com data: petapp-backend:$DATE${NC}"
docker tag petapp-backend:latest petapp-backend:$DATE

echo -e "${GREEN}Imagem Docker criada com sucesso!${NC}"
echo -e "Tag da imagem: ${YELLOW}petapp-backend:$DATE${NC}"
echo ""
echo -e "${YELLOW}Para enviar a imagem para um registro Docker:${NC}"
echo -e "1. Faça login no seu registro (exemplo com Docker Hub):"
echo -e "   docker login"
echo ""
echo -e "2. Tague a imagem com seu usuário/registro:"
echo -e "   docker tag petapp-backend:$DATE seu-usuario/petapp-backend:$DATE"
echo -e "   docker tag petapp-backend:$DATE seu-usuario/petapp-backend:latest"
echo ""
echo -e "3. Envie a imagem para o registro:"
echo -e "   docker push seu-usuario/petapp-backend:$DATE"
echo -e "   docker push seu-usuario/petapp-backend:latest"
echo ""
echo -e "${YELLOW}Para executar localmente com docker-compose:${NC}"
echo -e "   cp .env.production .env"
echo -e "   docker-compose up -d"
echo ""
echo -e "${GREEN}Processo concluído!${NC}"
