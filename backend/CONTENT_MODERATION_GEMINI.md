# Moderação de Conteúdo no PetApp

Este documento explica como funciona a moderação de conteúdo no PetApp e como configurar as diferentes opções disponíveis.

## Opções de Moderação de Texto

O PetApp oferece três opções para moderação de conteúdo de texto:

1. **OpenAI API (Paga)** - Oferece a análise mais precisa, mas requer uma assinatura paga.
2. **Google Gemini API (Gratuita)** - Alternativa gratuita com boa precisão.
3. **Moderação Básica (Fallback)** - Utiliza uma lista simples de palavras-chave proibidas.

## Configuração da Moderação

### 1. OpenAI API (opção paga)

Para utilizar a API da OpenAI:

1. Crie uma conta em [https://platform.openai.com/](https://platform.openai.com/)
2. Obtenha uma chave de API
3. Adicione a chave ao arquivo `.env`:
   ```
   OPENAI_API_KEY=sua_chave_openai_aqui
   ```

**Observação**: A OpenAI cobra por uso da API. Verifique os preços atuais em [https://openai.com/pricing](https://openai.com/pricing).

### 2. Google Gemini API (opção gratuita)

Para utilizar a API gratuita do Google Gemini:

1. Visite [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Crie uma chave de API gratuita
3. Adicione a chave ao arquivo `.env`:
   ```
   GEMINI_API_KEY=sua_chave_gemini_aqui
   ```

**Vantagens do Gemini**:
- API totalmente gratuita
- Cota generosa (1000+ solicitações/dia)
- Boa precisão na detecção de conteúdo impróprio

### 3. Moderação Básica (fallback automático)

Se nenhuma das opções acima estiver configurada, o sistema utilizará automaticamente a moderação básica, que:

- Utiliza uma lista predefinida de palavras proibidas
- Funciona sem conexão com internet
- É menos precisa que as opções baseadas em IA

## Moderação de Imagens

A moderação de imagens utiliza o Google Cloud Vision API para analisar e detectar conteúdo inadequado em imagens enviadas pelos usuários. **Esta funcionalidade requer configuração obrigatória.**

### Configuração da moderação de imagens:

1. Visite [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Crie um projeto (ou use um existente)
3. Habilite a API Vision
4. Crie uma chave de API
5. Adicione a chave ao arquivo `.env`:
   ```
   GOOGLE_API_KEY=sua_chave_google_cloud_aqui
   ```

**IMPORTANTE**: Sem esta chave configurada, a moderação de imagens rejeitará todas as imagens por segurança.

## Como Testar

Para testar a configuração de moderação, execute:

```bash
# Para testar a moderação de texto
node scripts/test-moderation.js

# Para testar apenas a moderação de imagens 
node scripts/test-image-moderation.js
```

Estes scripts testarão a moderação e mostrarão qual API está sendo utilizada.

## Resolução de Problemas

Se encontrar o erro `RateLimitError: 429 You exceeded your current quota` com a OpenAI:

1. Considere mudar para a opção gratuita do Google Gemini
2. Adicione a chave do Gemini ao arquivo `.env`
3. Remova ou comente a chave da OpenAI se quiser forçar o uso do Gemini

Se precisar de mais ajuda, consulte a documentação do Gemini em [https://ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs).
