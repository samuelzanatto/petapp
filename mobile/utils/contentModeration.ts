import { Alert } from 'react-native';

/**
 * Interface para erros de moderação de conteúdo
 */
export interface ContentModerationError {
  success: false;
  message: string;
  details?: {
    unsafeContent?: {
      adult: boolean;
      spoof: boolean;
      medical: boolean;
      violence: boolean;
      racy: boolean;
    };
    safetyScores?: {
      adult: number;
      spoof: number;
      medical: number;
      violence: number;
      racy: number;
    };
    categories?: Record<string, boolean>;
    scores?: Record<string, number>;
  };
}

/**
 * Verifica se um erro é relacionado à moderação de conteúdo
 */
export function isContentModerationError(error: any): error is ContentModerationError {
  console.log('Verificando se é erro de moderação:', error);
  
  return (
    error &&
    error.success === false &&
    typeof error.message === 'string' &&
    (error.message.includes('inapropriado') || 
     error.message.includes('proibido') ||
     error.message.includes('inadequado') ||
     (error.details && (error.details.unsafeContent || error.details.categories)))
  );
}

/**
 * Exibe alerta apropriado para erros de moderação de conteúdo e retorna true se foi tratado
 */
export function handleModerationError(error: any): boolean {
  if (isContentModerationError(error)) {
    let message = 'O conteúdo enviado não foi aprovado pela moderação automática.';
    
    if (error.details?.unsafeContent) {
      // Erro de moderação de imagem
      if (error.details.unsafeContent.adult) {
        message += '\n• A imagem contém conteúdo adulto.';
      }
      if (error.details.unsafeContent.violence) {
        message += '\n• A imagem contém conteúdo violento.';
      }
      if (error.details.unsafeContent.racy) {
        message += '\n• A imagem contém conteúdo sugestivo.';
      }
    } else if (error.details?.categories) {
      // Erro de moderação de texto
      const categoryNames: Record<string, string> = {
        'hate': 'Discurso de ódio',
        'hate/threatening': 'Ameaças ou discurso de ódio',
        'harassment': 'Assédio',
        'harassment/threatening': 'Assédio ou ameaças',
        'self-harm': 'Conteúdo de automutilação',
        'self-harm/intent': 'Intenção de automutilação',
        'sexual': 'Conteúdo sexual',
        'sexual/minors': 'Conteúdo sexual envolvendo menores',
        'violence': 'Violência',
        'violence/graphic': 'Violência gráfica',
        'profanity': 'Linguagem inadequada'
      };
      
      const detectedCategories = Object.entries(error.details.categories)
        .filter(([_, value]) => value === true)
        .map(([key, _]) => categoryNames[key] || key);
      
      if (detectedCategories.length > 0) {
        message += '\n• Categorias detectadas: ' + detectedCategories.join(', ');
      }
    }
    
    message += '\n\nPor favor, tente novamente com um conteúdo adequado.';
    
    Alert.alert(
      'Conteúdo Inapropriado',
      message,
      [{ text: 'Entendi', style: 'cancel' }]
    );
    
    return true; // Erro tratado
  }
  
  return false; // Não é erro de moderação
}

/**
 * Utilitário para analisar erros de API e verificar se são erros de moderação
 */
export async function handleApiError(error: any): Promise<boolean> {
  console.log('handleApiError recebeu:', error);
  
  // Verificar se é um erro de moderação de conteúdo
  // Para APIs REST, o erro pode vir no formato de Response que precisa ser parseado
  if (error && typeof error.json === 'function') {
    try {
      const errorData = await error.json();
      console.log('Erro parseado de Response:', errorData);
      return handleModerationError(errorData);
    } catch (jsonError) {
      // Falha ao fazer parse do JSON
      console.log('Falha ao fazer parse do JSON:', jsonError);
      return false;
    }
  } else if (error && error.response && error.response.data) {
    // Axios ou similar, com dados de resposta na propriedade response.data
    console.log('Erro com response.data:', error.response.data);
    return handleModerationError(error.response.data);
  } else {
    // Tentar diretamente o objeto de erro
    console.log('Tentando usar diretamente o objeto de erro');
    return handleModerationError(error);
  }
}