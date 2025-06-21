/**
 * Serviço de moderação de imagens usando Google Cloud Vision API
 */
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';

// Interface para resultados de moderação de imagem
export interface ImageModerationResult {
  isFlagged: boolean;
  unsafeContent: Record<string, boolean>;
  safetyScores: Record<string, number>;
  success: boolean;
  message?: string;
}

// Verificar se a chave de API do Google está configurada
if (!process.env.GOOGLE_API_KEY) {
  console.warn('Aviso: GOOGLE_API_KEY não está configurada. Adicione esta chave ao seu arquivo .env para usar a moderação de imagem.');
}

// Inicializar o cliente Cloud Vision
let visionClient: ImageAnnotatorClient | null = null;
try {
  if (process.env.GOOGLE_API_KEY) {
    visionClient = new ImageAnnotatorClient({
      apiKey: process.env.GOOGLE_API_KEY
    });
    console.log('Cliente Google Cloud Vision inicializado com sucesso');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    visionClient = new ImageAnnotatorClient();
    console.log('Cliente Google Cloud Vision inicializado com credenciais');
  }
} catch (error) {
  console.error('Erro ao inicializar cliente Google Cloud Vision:', error);
  console.error('Detalhes:', error instanceof Error ? error.message : String(error));
}

/**
 * Modera uma imagem usando o Google Cloud Vision API
 * @param imagePath Caminho do arquivo de imagem para moderar
 */
export const moderateImageWithVision = async (imagePath: string): Promise<ImageModerationResult> => {
  // Verificação básica se o caminho da imagem está vazio
  if (!imagePath || imagePath.trim() === '') {
    return {
      isFlagged: false,
      unsafeContent: {},
      safetyScores: {},
      success: false,
      message: 'Caminho da imagem vazio, nenhuma moderação possível'
    };
  }

  // Verificar se o arquivo existe
  if (!fs.existsSync(imagePath)) {
    return {
      isFlagged: false,
      unsafeContent: {},
      safetyScores: {},
      success: false,
      message: `Arquivo de imagem não encontrado: ${imagePath}`
    };
  }

  // Se o cliente Vision não estiver disponível, fazer verificação básica
  if (!visionClient) {
    console.warn('Cliente Cloud Vision não disponível, usando verificação básica de imagem');
    return {
      isFlagged: false, // Sem moderação, permitimos a imagem
      unsafeContent: {},
      safetyScores: {
        adult: 0,
        spoof: 0,
        medical: 0,
        violence: 0,
        racy: 0
      },
      success: true,
      message: 'Cliente Cloud Vision não está configurado. Usando aprovação automática.'
    };
  }

  try {
    console.log(`Moderando imagem com Cloud Vision: ${imagePath}`);

    // Ler a imagem como um buffer
    const imageBuffer = fs.readFileSync(imagePath);

    // Detectar conteúdo seguro/inseguro na imagem
    const [result] = await visionClient.safeSearchDetection({
      image: { content: imageBuffer }
    });

    // Verificar se temos resultados válidos
    const safeSearch = result.safeSearchAnnotation;
    if (!safeSearch) {
      throw new Error('Nenhum resultado de safeSearch retornado pela API');
    }

    // Mapear pontuações de categorias
    const categoryLevels: Record<string, number> = {
      'UNKNOWN': 0,
      'VERY_UNLIKELY': 0.1,
      'UNLIKELY': 0.3,
      'POSSIBLE': 0.5,
      'LIKELY': 0.7,
      'VERY_LIKELY': 0.9
    };

    // Converter string de likelihood em valores numéricos
    const safetyScores = {
      adult: categoryLevels[safeSearch.adult || 'UNKNOWN'] || 0,
      spoof: categoryLevels[safeSearch.spoof || 'UNKNOWN'] || 0,
      medical: categoryLevels[safeSearch.medical || 'UNKNOWN'] || 0,
      violence: categoryLevels[safeSearch.violence || 'UNKNOWN'] || 0,
      racy: categoryLevels[safeSearch.racy || 'UNKNOWN'] || 0
    };    // Verificar se alguma categoria está acima dos limites de segurança
    const unsafeThresholds = {
      adult: 0.7,    // LIKELY ou VERY_LIKELY
      violence: 0.7,  // LIKELY ou VERY_LIKELY
      racy: 0.7      // Abaixei o threshold para LIKELY também
    };

    const unsafeContent = {
      adult: safetyScores.adult >= unsafeThresholds.adult,
      violence: safetyScores.violence >= unsafeThresholds.violence,
      racy: safetyScores.racy >= unsafeThresholds.racy
    };

    // Sinalizar a imagem se qualquer categoria ultrapassar o limite
    const isFlagged = Object.values(unsafeContent).some(value => value === true);

    console.log(`Resultado da moderação: ${isFlagged ? 'Rejeitado' : 'Aprovado'}`);
    if (isFlagged) {
      console.log('Categorias sinalizadas:', 
        Object.entries(unsafeContent)
          .filter(([_, value]) => value === true)
          .map(([key, _]) => key)
          .join(', ')
      );
    }

    return {
      isFlagged,
      unsafeContent,
      safetyScores,
      success: true,
      message: isFlagged 
        ? 'Imagem contém conteúdo inadequado'
        : 'Imagem aprovada'
    };
  } catch (error) {
    console.error('Erro na moderação de imagem com Cloud Vision:', error);
    
    // Em caso de erro, permitir a imagem mas registrar o erro
    return {
      isFlagged: false,
      unsafeContent: {},
      safetyScores: {
        adult: 0,
        spoof: 0,
        medical: 0,
        violence: 0,
        racy: 0
      },
      success: false,
      message: `Erro ao moderar imagem: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};
