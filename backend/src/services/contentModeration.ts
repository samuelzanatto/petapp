/**
 * Funções de serviço para moderação de conteúdo.
 */
import { moderateTextWithGemini } from './geminiModeration';
import { moderateImageWithVision } from './cloudVisionModeration';

export interface TextModerationResult {
  isFlagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
  success?: boolean;
  message?: string;
}

export interface ImageModerationResult {
  isFlagged: boolean;
  unsafeContent: Record<string, boolean> | string[];
  safetyScores: Record<string, number>;
  success?: boolean;
  message?: string;
}

/**
 * Modera um texto para detectar conteúdo inapropriado.
 * @param text O texto a ser moderado.
 * @returns Um objeto indicando se o texto foi sinalizado e detalhes da moderação.
 */
export const moderateText = async (text: string): Promise<TextModerationResult> => {
  try {
    // Usar a implementação Gemini para moderação de texto
    return await moderateTextWithGemini(text);
  } catch (error) {
    console.error("Erro ao moderar texto:", error);
    
    // Implementação de fallback básica em caso de erro
    const isFlagged = text.toLowerCase().includes("inapropriado");
    
    return {
      isFlagged,
      categories: {
        hate: isFlagged && text.toLowerCase().includes("ódio"),
        sexual: isFlagged && text.toLowerCase().includes("sexual"),
        violence: isFlagged && text.toLowerCase().includes("violência"),
        selfHarm: isFlagged && text.toLowerCase().includes("auto-mutilação"),
      },
      categoryScores: {
        hate: isFlagged && text.toLowerCase().includes("ódio") ? 0.9 : 0.1,
        sexual: isFlagged && text.toLowerCase().includes("sexual") ? 0.9 : 0.1,
        violence: isFlagged && text.toLowerCase().includes("violência") ? 0.9 : 0.1,
        selfHarm: isFlagged && text.toLowerCase().includes("auto-mutilação") ? 0.9 : 0.1,
      },
      success: true,
      message: "Usando moderação de texto de fallback"
    };
  }
};

/**
 * Modera uma imagem para detectar conteúdo inapropriado.
 * @param imagePath O caminho para o arquivo de imagem a ser moderado.
 * @returns Um objeto indicando se a imagem foi sinalizada e detalhes da moderação.
 */
export const moderateImage = async (imagePath: string): Promise<ImageModerationResult> => {
  try {
    // Usar a implementação Cloud Vision para moderação de imagens
    return await moderateImageWithVision(imagePath);
  } catch (error) {
    console.error("Erro ao moderar imagem:", error);
    
    // Implementação de fallback em caso de erro
    console.log(`Moderando imagem em: ${imagePath} (modo fallback)`);
    
    return {
      isFlagged: false,
      unsafeContent: [],
      safetyScores: {
        adult: 0.1,
        spoof: 0.1,
        medical: 0.1,
        violence: 0.1,
        racy: 0.1,
      },
      success: false,
      message: `Erro ao moderar imagem: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};
