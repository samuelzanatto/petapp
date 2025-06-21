import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { api } from '@/services/api';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleApiError } from './contentModeration';
import { checkServerConnectivity } from './connectivity';

/**
 * Otimiza uma imagem antes de fazer upload
 */
export async function optimizeImage(uri: string): Promise<string> {
  try {
    // Redimensionar e comprimir a imagem
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }], // Instagram usa 1080px como padrão
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    return result.uri;
  } catch (error) {
    console.error('Erro ao otimizar imagem:', error);
    return uri; // Em caso de erro, retorna a URI original
  }
}

/**
 * Faz upload de uma imagem para o servidor usando FormData
 */
export async function uploadImageFromUri(
  uri: string, 
  folder: string = 'posts'
): Promise<{ id: string; path: string; url: string; versions: Record<string, string> }> {  try {
    console.log(`Preparando upload de: ${uri}`);
    
    // Primeiro, otimizar a imagem
    const optimizedUri = await optimizeImage(uri);
    console.log(`Imagem otimizada: ${optimizedUri}`);
    
    // Obter informações do arquivo
    const fileInfo = await FileSystem.getInfoAsync(optimizedUri);
    if (!fileInfo.exists) {
      throw new Error('Arquivo não encontrado');
    }
    
    // Criar o FormData
    const formData = new FormData();
    
    // Extrair informações e nome do arquivo
    const filename = optimizedUri.split('/').pop() || `image_${Date.now()}.jpg`;
    const fileExt = optimizedUri.split('.').pop() || 'jpg';
    
    // Adicionar o arquivo ao FormData
    // @ts-ignore - React Native's FormData differes from standard web FormData
    formData.append('image', {
      uri: Platform.OS === 'android' ? optimizedUri : optimizedUri.replace('file://', ''),
      name: filename,
      type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
    } as any);    // Verificar se o backend está acessível antes de tentar fazer upload
    const isConnected = await checkServerConnectivity(3000);
    if (!isConnected) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.');
    }
    
    // Fazer o upload usando a função api.fetchApi que agora gerencia corretamente o token e Content-Type
    console.log(`Enviando para: /upload/image?folder=${folder}`);
    const response = await api.fetchApi(`/upload/image?folder=${folder}`, {
      method: 'POST',
      body: formData
    });
    
    console.log('Upload concluído com sucesso:', response);
    return response;} catch (error: any) {
    console.error('Erro ao fazer upload da imagem:', error);
    
    // Verificar se é um erro de moderação de conteúdo
    try {
      const isModerationError = await handleApiError(error);
      if (isModerationError) {
        // Rethrow com mensagem específica para moderação
        throw new Error('Conteúdo inapropriado detectado');
      } else {
        // Rethrow erro original
        throw error;
      }
    } catch (e) {
      // Se o handleApiError falhar, lançar o erro original
      throw error;
    }
  }
}

/**
 * Faz upload de uma imagem base64 para o servidor (alternativa para casos especiais)
 */
export async function uploadBase64Image(
  base64: string,
  folder: string = 'posts'
): Promise<{ id: string; path: string; url: string; versions: Record<string, string> }> {
  try {
    // Garantir formato correto do base64
    let formattedBase64 = base64;
    if (!formattedBase64.startsWith('data:image/')) {
      formattedBase64 = `data:image/jpeg;base64,${base64}`;
    }
    
    // Fazer o upload usando a API
    const response = await api.post('/upload/base64', {
      base64Image: formattedBase64,
      folder
    });
    
    return response;
  } catch (error: any) {
    console.error('Erro no upload de imagem base64:', error);
    
    // Verificar se é um erro de moderação de conteúdo
    if (await handleApiError(error)) {
      throw new Error('Conteúdo inapropriado detectado');
    }
    
    throw error;
  }
}

/**
 * Função específica para upload de imagens de pets
 */
export async function uploadPetImage(uri: string): Promise<string> {
  try {
    const response = await uploadImageFromUri(uri, 'pets');
    return response.path; // Retornar apenas o caminho relativo da imagem
  } catch (error) {
    console.error('Erro ao fazer upload de imagem de pet:', error);
    throw error;
  }
}
