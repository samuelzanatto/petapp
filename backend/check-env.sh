#!/bin/bash
# Script para verificar se todas as variáveis de ambiente necessárias estão configuradas

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Verificando configurações de ambiente para o PetApp Backend${NC}"

# Variáveis obrigatórias
REQUIRED_VARS=(
  "DATABASE_URL"
  "JWT_SECRET"
  "PORT"
  "NODE_ENV"
)

# Variáveis opcionais mas importantes
RECOMMENDED_VARS=(
  "FIREBASE_SERVICE_ACCOUNT_PATH"
  "GOOGLE_API_KEY"
  "GEMINI_API_KEY"
  "OPENAI_API_KEY"
)

ENV_FILE=".env.production"

# Verificar se o arquivo .env.production existe
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}Arquivo $ENV_FILE não encontrado!${NC}"
  echo -e "Por favor, crie o arquivo $ENV_FILE com as configurações de produção."
  exit 1
fi

# Verificar variáveis obrigatórias
echo -e "${YELLOW}Verificando variáveis obrigatórias:${NC}"
MISSING_REQUIRED=0

for var in "${REQUIRED_VARS[@]}"; do
  if grep -q "^$var=" "$ENV_FILE"; then
    echo -e "✅ $var: ${GREEN}Configurado${NC}"
  else
    echo -e "❌ $var: ${RED}NÃO CONFIGURADO${NC}"
    MISSING_REQUIRED=$((MISSING_REQUIRED+1))
  fi
done

# Verificar variáveis recomendadas
echo -e "\n${YELLOW}Verificando variáveis recomendadas:${NC}"
MISSING_RECOMMENDED=0

for var in "${RECOMMENDED_VARS[@]}"; do
  if grep -q "^$var=" "$ENV_FILE"; then
    echo -e "✅ $var: ${GREEN}Configurado${NC}"
  else
    echo -e "⚠️ $var: ${YELLOW}NÃO CONFIGURADO${NC}"
    MISSING_RECOMMENDED=$((MISSING_RECOMMENDED+1))
  fi
done

# Verificar se o Docker está instalado
echo -e "\n${YELLOW}Verificando pré-requisitos do sistema:${NC}"
if command -v docker &> /dev/null; then
  DOCKER_VERSION=$(docker --version)
  echo -e "✅ Docker: ${GREEN}Instalado${NC} - $DOCKER_VERSION"
else
  echo -e "❌ Docker: ${RED}NÃO INSTALADO${NC}"
fi

if command -v docker-compose &> /dev/null; then
  COMPOSE_VERSION=$(docker-compose --version)
  echo -e "✅ Docker Compose: ${GREEN}Instalado${NC} - $COMPOSE_VERSION"
else
  echo -e "❌ Docker Compose: ${RED}NÃO INSTALADO${NC}"
fi

# Verificar arquivos de credenciais
echo -e "\n${YELLOW}Verificando arquivos de credenciais:${NC}"
if [ -f "./credentials/firebase-service-account.json" ]; then
  echo -e "✅ Firebase Service Account: ${GREEN}Encontrado${NC}"
else
  echo -e "❌ Firebase Service Account: ${RED}NÃO ENCONTRADO${NC}"
  MISSING_RECOMMENDED=$((MISSING_RECOMMENDED+1))
fi

if [ -f "./credentials/google-cloud-vision.json" ]; then
  echo -e "✅ Google Cloud Vision: ${GREEN}Encontrado${NC}"
else
  echo -e "⚠️ Google Cloud Vision: ${YELLOW}NÃO ENCONTRADO${NC}"
fi

# Resumo
echo -e "\n${YELLOW}Resumo da verificação:${NC}"
if [ $MISSING_REQUIRED -eq 0 ]; then
  echo -e "✅ ${GREEN}Todas as variáveis obrigatórias estão configuradas.${NC}"
else
  echo -e "❌ ${RED}$MISSING_REQUIRED variáveis obrigatórias estão faltando!${NC}"
fi

if [ $MISSING_RECOMMENDED -eq 0 ]; then
  echo -e "✅ ${GREEN}Todas as variáveis recomendadas estão configuradas.${NC}"
else
  echo -e "⚠️ ${YELLOW}$MISSING_RECOMMENDED variáveis/arquivos recomendados estão faltando.${NC}"
fi

# Conclusão
if [ $MISSING_REQUIRED -eq 0 ]; then
  echo -e "\n${GREEN}O ambiente está pronto para build e deploy! 🚀${NC}"
  if [ $MISSING_RECOMMENDED -gt 0 ]; then
    echo -e "${YELLOW}Mas algumas configurações recomendadas estão faltando.${NC}"
  fi
else
  echo -e "\n${RED}O ambiente NÃO está pronto para deploy.${NC}"
  echo -e "${RED}Por favor, configure as variáveis obrigatórias faltantes.${NC}"
  exit 1
fi
