// Serviço de moderação de conteúdo usando Google Gemini
import { GoogleGenAI } from '@google/genai';
import { TextModerationResult } from './contentModeration';

// Verificar se a chave de API do Gemini está configurada
if (!process.env.GEMINI_API_KEY) {
  console.warn('Aviso: GEMINI_API_KEY não está configurada. Adicione esta chave ao seu arquivo .env para usar a moderação de texto Gemini.');
}

// Inicializar o cliente Gemini
let geminiClient: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
    console.log('Cliente Google Gemini inicializado com sucesso');
  }
} catch (error) {
  console.error('Erro ao inicializar cliente Google Gemini:', error);
}

/**
 * Categorias de moderação que queremos identificar
 */
const MODERATION_CATEGORIES = {
  'harassment': 'Assédio ou bullying',
  'hate': 'Discurso de ódio',
  'sexual': 'Conteúdo sexual',
  'self-harm': 'Auto-agressão',
  'violence': 'Violência',
  'threatening': 'Ameaças',
  'profanity': 'Linguagem vulgar/palavrões'
};

/**
 * Modera conteúdo de texto usando a API do Google Gemini
 * @param text Texto para moderar
 */
export const moderateTextWithGemini = async (text: string): Promise<TextModerationResult> => {
  // Verificação básica se o texto está vazio
  if (!text || text.trim() === '') {
    return {
      isFlagged: false,
      categories: {},
      categoryScores: {},
      success: true,
      message: 'Texto vazio, nenhuma moderação necessária'
    };
  }

  // Se o cliente Gemini não estiver disponível, fazer verificação básica
  if (!geminiClient) {
    return moderateTextBasic(text);
  }  try {
    // Usar o método generateContent diretamente
    const result = await geminiClient.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: `
      Analise o seguinte texto para verificar se contém conteúdo impróprio.
      
      Texto para analisar: "${text}"
      
      Para cada categoria abaixo, atribua uma pontuação de 0 a 1, onde:
      0 = Não contém este tipo de conteúdo
      1 = Definitivamente contém este tipo de conteúdo
      
      Categorias:
      - harassment: conteúdo que assedia, intimida ou bullying
      - hate: discurso de ódio, preconceito ou discriminação
      - sexual: conteúdo sexualmente explícito ou sugestivo
      - self-harm: conteúdo que promove autoagressão
      - violence: conteúdo violento ou glorificação da violência
      - threatening: ameaças diretas ou indiretas
      - profanity: palavrões ou linguagem vulgar
      
      Responda apenas no formato JSON, como este exemplo:
      {
        "flagged": true/false,
        "categories": {
          "harassment": true/false,
          "hate": true/false,
          "sexual": true/false,
          "self-harm": true/false,
          "violence": true/false,
          "threatening": true/false,
          "profanity": true/false
        },
        "categoryScores": {
          "harassment": 0.0,
          "hate": 0.0,
          "sexual": 0.0,
          "self-harm": 0.0,
          "violence": 0.0,
          "threatening": 0.0,
          "profanity": 0.0
        }
      }
      `
    });
    
    const textResult = result.text;
    
    // Verificar se textResult é undefined
    if (!textResult) {
      throw new Error('Resposta vazia do Gemini');
    }
    
    // Extrair JSON da resposta
    const jsonMatch = textResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Formato de resposta inválido do Gemini');
    }
    
    const parsedResult = JSON.parse(jsonMatch[0]);
    
    return {
      isFlagged: parsedResult.flagged,
      categories: parsedResult.categories,
      categoryScores: parsedResult.categoryScores,
      success: true,
      message: parsedResult.flagged 
        ? `Conteúdo inadequado detectado. Por favor, revise seu texto e remova qualquer conteúdo inapropriado.`
        : 'Conteúdo aprovado'
    };
  } catch (error) {
    console.error('Erro na moderação de texto com Gemini:', error);
    
    // Em caso de erro, use a moderação básica como fallback
    return moderateTextBasic(text);
  }
};

/**
 * Implementação básica de moderação de texto usando uma lista de palavras proibidas
 * @param text Texto para moderar
 */
export const moderateTextBasic = (text: string): TextModerationResult => {
  // Lista de palavras proibidas em português e inglês
  const forbiddenWords = [
    'merda', 'porra', 'caralho', 'puta', 'foda', 'buceta', 
    'cu', 'piranha', 'viado', 'vagabunda', 'boquete',
    // Versões em inglês
    'fuck', 'shit', 'bitch', 'ass', 'pussy', 'dick'
  ];
  
  const lowerText = text.toLowerCase();
  const containsForbiddenWord = forbiddenWords.some(word => 
    lowerText.includes(word.toLowerCase())
  );
  
  return {
    isFlagged: containsForbiddenWord,
    categories: {
      'profanity': containsForbiddenWord
    },
    categoryScores: {
      'profanity': containsForbiddenWord ? 1 : 0,
      'harassment': 0,
      'hate': 0,
      'sexual': 0,
      'self-harm': 0,
      'violence': 0,
      'threatening': 0
    },
    success: true,    message: containsForbiddenWord ? 'Texto contém linguagem inadequada. Por favor, revise seu texto e remova palavrões ou termos ofensivos.' : 'Texto aprovado'
  };
};
