import { supabase } from '../config/supabase';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { moderateImageBuffer } from './bufferModeration';

export type BucketType = 'users' | 'pets' | 'posts' | 'alerts' | 'claims';

type ImageSize = {
  width: number;
  height: number;
  suffix: string;
};

// Configurações para diferentes tamanhos de imagem
const IMAGE_SIZES: Record<BucketType | 'default', ImageSize[]> = {
  posts: [
    { width: 1080, height: 1080, suffix: 'full' },
    { width: 600, height: 600, suffix: 'medium' },
    { width: 320, height: 320, suffix: 'thumbnail' }
  ],
  pets: [
    { width: 800, height: 800, suffix: 'full' },
    { width: 400, height: 400, suffix: 'medium' },
    { width: 150, height: 150, suffix: 'thumbnail' }
  ],
  users: [
    { width: 400, height: 400, suffix: 'full' },
    { width: 150, height: 150, suffix: 'thumbnail' }
  ],
  alerts: [
    { width: 800, height: 800, suffix: 'full' },
    { width: 400, height: 400, suffix: 'medium' }
  ],
  claims: [
    { width: 800, height: 800, suffix: 'full' },
    { width: 400, height: 400, suffix: 'medium' }
  ],
  default: [
    { width: 1000, height: 1000, suffix: 'full' },
    { width: 500, height: 500, suffix: 'medium' },
    { width: 200, height: 200, suffix: 'thumbnail' }
  ]
};

export interface UploadResult {
  id: string;
  path: string;
  url: string;
  versions: Record<string, string>;
}

/**
 * Faz upload de uma imagem para o Supabase Storage
 * @param buffer Buffer da imagem
 * @param bucket Bucket de destino
 * @param mimeType Tipo MIME da imagem
 * @param moderateContent Se deve moderar o conteúdo da imagem (padrão: true)
 * @returns Resultado do upload com URLs das versões
 */
export async function uploadImage(
  buffer: Buffer,
  bucket: BucketType,
  mimeType: string,
  moderateContent: boolean = true
): Promise<UploadResult> {
  // Moderar conteúdo se solicitado
  if (moderateContent) {
    const moderationResult = await moderateImageBuffer(buffer, mimeType);
    
    if (moderationResult.isFlagged) {
      throw new Error('Imagem com conteúdo impróprio detectado. Por favor, envie uma imagem apropriada.');
    }
  }
  
  // Gerar ID único para a imagem
  const imageId = uuidv4();
  
  // Determinar extensão
  let extension = 'jpg';
  if (mimeType === 'image/png') extension = 'png';
  if (mimeType === 'image/gif') extension = 'gif';
  if (mimeType === 'image/webp') extension = 'webp';
  
  // Escolher os tamanhos com base no bucket
  const sizes = IMAGE_SIZES[bucket] || IMAGE_SIZES.default;
  
  // Processar e fazer upload de cada tamanho
  const versions: Record<string, string> = {};
  const uploadPromises: Promise<any>[] = [];
  
  for (const size of sizes) {
    const filename = `${imageId}_${size.suffix}.${extension}`;
    const path = filename;
    
    // Processar imagem com Sharp
    const processedBuffer = await sharp(buffer)
      .resize(size.width, size.height, {
        fit: 'cover',
        position: 'center'
      })
      .toBuffer();
    
    // Fazer upload para o Supabase Storage
    const uploadPromise = supabase.storage
      .from(bucket)
      .upload(path, processedBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      })
      .then(({ data, error }) => {
        if (error) {
          console.error(`Erro ao fazer upload de ${size.suffix}:`, error);
          throw new Error(`Falha ao fazer upload da imagem ${size.suffix}`);
        }
        
        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);
        
        versions[size.suffix] = urlData.publicUrl;
        
        return { size: size.suffix, path, url: urlData.publicUrl };
      });
    
    uploadPromises.push(uploadPromise);
  }
  
  // Aguardar todos os uploads
  await Promise.all(uploadPromises);
  
  // Retornar resultado
  const mainVersion = versions.full || versions.medium || Object.values(versions)[0];
  
  return {
    id: imageId,
    path: mainVersion,
    url: mainVersion,
    versions
  };
}

/**
 * Deleta uma imagem e suas versões do Supabase Storage
 * @param bucket Bucket onde está a imagem
 * @param imageId ID da imagem (sem extensão)
 */
export async function deleteImage(
  bucket: BucketType,
  imageId: string
): Promise<void> {
  // Listar todos os arquivos com o imageId
  const { data: files, error: listError } = await supabase.storage
    .from(bucket)
    .list('', {
      search: imageId
    });
  
  if (listError) {
    console.error('Erro ao listar arquivos para deletar:', listError);
    throw new Error('Falha ao deletar imagem');
  }
  
  if (!files || files.length === 0) {
    console.warn(`Nenhum arquivo encontrado com ID ${imageId}`);
    return;
  }
  
  // Deletar todos os arquivos encontrados
  const filesToDelete = files.map(file => file.name);
  
  const { error: deleteError } = await supabase.storage
    .from(bucket)
    .remove(filesToDelete);
  
  if (deleteError) {
    console.error('Erro ao deletar arquivos:', deleteError);
    throw new Error('Falha ao deletar imagem');
  }
}

/**
 * Faz download de uma imagem do Supabase Storage
 * @param bucket Bucket onde está a imagem
 * @param path Caminho do arquivo
 * @returns Buffer da imagem
 */
export async function downloadImage(
  bucket: BucketType,
  path: string
): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);
  
  if (error) {
    console.error('Erro ao fazer download da imagem:', error);
    throw new Error('Falha ao fazer download da imagem');
  }
  
  // Converter Blob para Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Obtém a URL pública de uma imagem
 * @param bucket Bucket onde está a imagem
 * @param path Caminho do arquivo
 * @returns URL pública da imagem
 */
export function getPublicUrl(bucket: BucketType, path: string): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

/**
 * Cria uma URL assinada com tempo de expiração
 * @param bucket Bucket onde está a imagem
 * @param path Caminho do arquivo
 * @param expiresIn Tempo de expiração em segundos (padrão: 3600 - 1 hora)
 * @returns URL assinada
 */
export async function createSignedUrl(
  bucket: BucketType,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  
  if (error) {
    console.error('Erro ao criar URL assinada:', error);
    throw new Error('Falha ao criar URL assinada');
  }
  
  return data.signedUrl;
}
