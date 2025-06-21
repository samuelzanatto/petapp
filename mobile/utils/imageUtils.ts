import { API_URL } from '@/constants/Config';

/**
 * Converte um caminho de imagem relativo do servidor em uma URL completa
 * @param imagePath Caminho relativo da imagem (ex: uploads/posts/imagem.jpg)
 * @returns URL completa da imagem
 */
export const getImageUrl = (imagePath: string | null): string => {
  if (!imagePath) {
    return '';
  }
  
  // Se já for uma URL completa, retorna ela mesma
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Extrai o domínio da API_URL (remove '/api' do final)
  const baseUrl = API_URL.replace(/\/api$/, '');
  
  // Garante que o caminho da imagem não tenha barras duplicadas
  const normalizedPath = imagePath.replace(/\\/g, '/');
  
  return `${baseUrl}/${normalizedPath}`;
};