FROM node:20-slim AS builder

WORKDIR /app

# Instalar OpenSSL para o Prisma
RUN apt-get update -y && apt-get install -y openssl

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências com cache
RUN npm ci

# Copiar código fonte
COPY . .

# Gerar Prisma Client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Segunda etapa - imagem final
FROM node:20-slim AS runner

WORKDIR /app

# Instalar OpenSSL para o Prisma
RUN apt-get update -y && apt-get install -y openssl

# Configurações de ambiente
ENV NODE_ENV=production

# Copiar arquivos necessários
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/credentials ./credentials

# Criar diretórios de uploads
RUN mkdir -p uploads/pets uploads/posts uploads/users uploads/alerts uploads/claims uploads/tests

# Expor porta
EXPOSE 3000

# Executar aplicação
CMD ["npm", "start"]
