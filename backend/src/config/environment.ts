/**
 * Configuração de ambiente para a aplicação
 */

const config = {
  // Configurações do Google Cloud Vision API para moderação de imagens
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
    // Limiares para detecção de conteúdo impróprio (1-5)
    // 1: VERY_UNLIKELY, 2: UNLIKELY, 3: POSSIBLE, 4: LIKELY, 5: VERY_LIKELY
    thresholds: {
      adult: 4, // LIKELY ou superior para conteúdo adulto
      medical: 5, // Apenas VERY_LIKELY para conteúdo médico
      violence: 4, // LIKELY ou superior para violência
      racy: 4, // LIKELY ou superior para conteúdo sugestivo
      spoof: 5, // Apenas VERY_LIKELY para spoof
    }
  },
  
  // Configurações do Gemini API para moderação de texto
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.0-flash-001',
    scoreThreshold: 0.70, // Limiar para considerar o conteúdo impróprio
  },
  
  // Configurações gerais de moderação
  moderation: {
    // Se true, rejeita todas as imagens quando a API não está configurada
    rejectImagesWhenApiUnavailable: true,
    // Capacidade de ignorar a moderação para administradores
    bypassForAdmins: false,
  }
};

export default config;
