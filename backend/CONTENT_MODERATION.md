# Sistema de Moderação de Conteúdo

Este documento descreve o sistema de moderação de conteúdo implementado no PetApp para filtrar comentários inapropriados e imagens indevidas.

## Visão Geral

O sistema de moderação utiliza duas tecnologias principais:

1. **Google Cloud Vision API**: Para detecção de conteúdo inapropriado em imagens
2. **OpenAI Moderation API**: Para filtragem de texto em comentários e mensagens

## Recursos Implementados

### Moderação de Imagens

O sistema utiliza o Google Cloud Vision API para detectar:
- Conteúdo adulto
- Violência
- Conteúdo sugestivo (racy)
- Imagens médicas
- Conteúdo enganoso (spoof)

A pontuação para cada categoria varia de 1 (VERY_UNLIKELY) a 5 (VERY_LIKELY). 
Imagens com pontuação >= 4 (LIKELY ou VERY_LIKELY) para conteúdo adulto, violência ou sugestivo são automaticamente rejeitadas.

### Moderação de Texto

O sistema utiliza a API de Moderação da OpenAI para detectar:
- Linguagem de ódio
- Linguagem obscena/profana
- Conteúdo sexual
- Ameaças
- Automutilação
- Violência

O sistema pode funcionar em modo de fallback usando uma lista de palavras-chave proibidas quando a API da OpenAI não estiver disponível.

## Fluxo de Funcionamento

1. Quando um usuário envia um comentário ou mensagem:
   - O middleware `textModerationMiddleware` intercepta a requisição
   - Verifica se o texto contém conteúdo inapropriado
   - Rejeita a requisição se o conteúdo for impróprio

2. Quando um usuário faz upload de uma imagem:
   - O middleware `imageModerationMiddleware` intercepta a requisição
   - Usa o Google Cloud Vision para analisar a imagem
   - Rejeita a requisição se a imagem contiver conteúdo inapropriado

## Configuração

### Requisitos

1. **Google Cloud Vision API**:
   - Conta no Google Cloud Platform
   - API Vision habilitada
   - Credenciais configuradas no arquivo JSON ou chave de API

2. **OpenAI API**:
   - Conta na OpenAI
   - Chave de API com acesso ao endpoint de moderação

### Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env`:

```
# Google Cloud Vision API (OBRIGATÓRIA para moderação de imagens)
GOOGLE_API_KEY=sua-chave-api-do-google-cloud

# OpenAI API (opcional para moderação de texto)
OPENAI_API_KEY=sua-chave-api-da-openai

# Google Gemini API (alternativa gratuita para moderação de texto)
GEMINI_API_KEY=sua-chave-api-do-gemini
```

**IMPORTANTE**: A moderação de imagens requer obrigatoriamente a configuração da `GOOGLE_API_KEY`. Sem ela, todas as imagens serão rejeitadas por segurança.

### Personalização

Os níveis de sensibilidade da moderação podem ser ajustados nos arquivos:
- `src/services/contentModeration.ts` - Para modificar os limiares de detecção
- `src/middlewares/contentModeration.ts` - Para personalizar a resposta de rejeição

## Integrações

O sistema está integrado com as seguintes funcionalidades do app:
- Upload de imagens (perfil, pets, posts, alertas)
- Criação de posts
- Comentários em posts
- Mensagens no chat

## Limitações Conhecidas

- Quando a API da OpenAI não está disponível, a detecção de texto usa uma lista básica de palavras-chave
- Alguns emojis e gírias regionais podem não ser adequadamente detectados
- Conteúdo em idiomas menos comuns pode ter menor precisão de detecção

## Evolução Futura

Possíveis melhorias para versões futuras:
- Implementar cache de resultados para reduzir custos de API
- Adicionar moderação em tempo real para mensagens de chat
- Implementar sistema de relatórios de usuários para moderar conteúdo não detectado automaticamente
- Adicionar suporte para análise de áudio em mensagens de voz
