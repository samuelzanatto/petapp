export const Fonts = {
  inter: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium', 
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    light: 'Inter_300Light',
  },
  default: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
    light: 'System',
  }
};

// Defina qual fonte utilizar
export const FontFamily = Fonts.inter;

// Configuração consistente de tipografia
export const Typography = {
  // Tamanhos de fonte
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  // Pesos de fonte com os nomes correspondentes da família Inter
  weights: {
    light: FontFamily.light,
    regular: FontFamily.regular,
    medium: FontFamily.medium,
    semiBold: FontFamily.semiBold,
    bold: FontFamily.bold,
  },
  
  // Configurações para linha de base
  lineHeights: {
    tight: 1.2,     // Para títulos
    normal: 1.5,    // Para texto padrão
    relaxed: 1.75,  // Para textos mais leves
  }
};