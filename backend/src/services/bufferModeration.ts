/**
 * Serviço de moderação de imagens em buffer usando Google Cloud Vision API
 */
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';

// Interface para resultados de moderação de imagem
export interface BufferModerationResult {
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
    console.log('Cliente Google Cloud Vision inicializado com sucesso (Buffer)');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    visionClient = new ImageAnnotatorClient();
    console.log('Cliente Google Cloud Vision inicializado com credenciais (Buffer)');
  }
} catch (error) {
  console.error('Erro ao inicializar cliente Google Cloud Vision:', error);
  console.error('Detalhes:', error instanceof Error ? error.message : String(error));
}

/**
 * Modera uma imagem de buffer usando o Google Cloud Vision API
 * @param buffer Buffer com os dados da imagem
 * @param mimeType Tipo MIME da imagem (ex: image/jpeg, image/png)
 */
export const moderateImageBuffer = async (
  buffer: Buffer,
  mimeType: string
): Promise<BufferModerationResult> => {
  // Verificação básica se o buffer está vazio
  if (!buffer || buffer.length === 0) {
    return {
      isFlagged: false,
      unsafeContent: {},
      safetyScores: {},
      success: false,
      message: 'Buffer de imagem vazio, nenhuma moderação possível'
    };
  }

  // Verificar se é uma imagem
  if (!mimeType.startsWith('image/')) {
    return {
      isFlagged: false,
      unsafeContent: {},
      safetyScores: {},
      success: false,
      message: `Tipo de arquivo não suportado: ${mimeType}`
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
    console.log(`Moderando buffer de imagem (${buffer.length} bytes)`);

    // Detectar conteúdo seguro/inseguro na imagem diretamente do buffer
    const [result] = await visionClient.safeSearchDetection({
      image: { content: buffer }
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
    };

    // Verificar se alguma categoria está acima dos limites de segurança
    const unsafeThresholds = {
      adult: 0.7,    // LIKELY ou VERY_LIKELY
      violence: 0.7,  // LIKELY ou VERY_LIKELY
      racy: 0.7      // LIKELY ou VERY_LIKELY
    };

    const unsafeContent = {
      adult: safetyScores.adult >= unsafeThresholds.adult,
      violence: safetyScores.violence >= unsafeThresholds.violence,
      racy: safetyScores.racy >= unsafeThresholds.racy
    };

    // Sinalizar a imagem se qualquer categoria ultrapassar o limite
    const isFlagged = Object.values(unsafeContent).some(value => value === true);

    console.log(`Resultado da moderação do buffer: ${isFlagged ? 'Rejeitado' : 'Aprovado'}`);
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
    console.error('Erro na moderação do buffer de imagem com Cloud Vision:', error);
    
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
      message: `Erro ao moderar buffer de imagem: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * Salva temporariamente um buffer em arquivo para testes
 * @param buffer Buffer da imagem
 * @param mimeType Tipo MIME da imagem
 * @returns Caminho do arquivo temporário
 */
export const saveBufferToTempFile = async (
  buffer: Buffer,
  mimeType: string
): Promise<string> => {
  // Determinar extensão com base no MIME type
  let extension = 'jpg';
  if (mimeType === 'image/png') extension = 'png';
  if (mimeType === 'image/gif') extension = 'gif';
  if (mimeType === 'image/webp') extension = 'webp';
  
  // Criar um nome de arquivo único
  const fileName = `temp-${crypto.randomBytes(8).toString('hex')}.${extension}`;
  const filePath = path.join(os.tmpdir(), fileName);
  
  // Salvar o buffer em um arquivo temporário
  await fs.promises.writeFile(filePath, buffer);
  
  return filePath;
};
