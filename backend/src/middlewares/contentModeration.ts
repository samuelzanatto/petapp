/**
 * Middlewares para moderação de conteúdo
 * 
 * Estes middlewares são usados para moderar texto e imagens enviados pelos usuários
 * antes que sejam salvos no banco de dados ou apresentados a outros usuários.
 */
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';

// Importação direta das funções
import { 
  moderateText, 
  moderateImage,
} from '../services/contentModeration';
import { moderateImageBuffer } from '../services/bufferModeration';

/**
 * Middleware para moderação de texto
 * Verifica o conteúdo de texto em req.body para detectar conteúdo inapropriado
 */
export const textModerationMiddleware = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {    // Verificar campos de texto comuns em requisições
    const textFieldsToModerate = ['text', 'content', 'message', 'description', 'title', 'comment', 'caption'];
    
    // Encontrar campos de texto na requisição
    const textsToModerate = textFieldsToModerate
      .filter(field => req.body[field] && typeof req.body[field] === 'string')
      .map(field => ({ field, content: req.body[field] }));
    
    // Se não houver texto para moderar, prosseguir
    if (textsToModerate.length === 0) {
      return next();
    }
    
    // Moderar cada campo de texto
    for (const { field, content } of textsToModerate) {
      const result = await moderateText(content);
      
      // Se o texto for sinalizado como impróprio, rejeitar a requisição
      if (result.isFlagged) {
        // Detalhar quais categorias de conteúdo foram detectadas
        const flaggedCategories = Object.entries(result.categories)
          .filter(([_, value]) => value === true)
          .map(([key, _]) => key);
        
        return res.status(400).json({
          success: false,
          message: 'Conteúdo de texto inapropriado detectado. Por favor, revise seu texto e remova qualquer conteúdo inadequado.',
          details: {
            field,
            categories: result.categories,
            categoryScores: result.categoryScores,
          }
        });
      }
    }
    
    // Se todos os textos passarem na moderação, prosseguir
    next();
    
  } catch (error) {
    console.error('Erro no middleware de moderação de texto:', error);
    
    // Em caso de erro no middleware, permitir a continuação para não bloquear a requisição
    // Mas registrar o erro para investigação
    next();
  }
};

/**
 * Middleware para moderação de imagens
 * Verifica imagens enviadas via multer para detectar conteúdo inapropriado
 * Suporta tanto imagens salvas em disco quanto imagens em buffer na memória
 */
export const imageModerationMiddleware = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {  try {
    // Verificar se há arquivos para moderar
    if (!req.file && (!req.files || Object.keys(req.files).length === 0)) {
      return next();
    }
    
    // Lista de arquivos para moderar
    const filesToModerate: { 
      path?: string; 
      buffer?: Buffer; 
      fieldname: string;
      mimetype?: string;
    }[] = [];
    
    // Adicionar arquivo único, se existir
    if (req.file) {
      // Verificar se temos um arquivo com caminho em disco ou um buffer em memória
      if (req.file.path) {
        console.log('Moderando arquivo único em disco:', req.file.path);
        filesToModerate.push({ 
          path: req.file.path, 
          fieldname: req.file.fieldname 
        });
      } else if (req.file.buffer) {
        console.log('Moderando arquivo único em buffer, tamanho:', req.file.buffer.length);
        filesToModerate.push({ 
          buffer: req.file.buffer, 
          fieldname: req.file.fieldname,
          mimetype: req.file.mimetype
        });
      } else {
        console.warn('Arquivo sem path ou buffer detectado, não será possível moderar');
      }
    }
    
    // Adicionar múltiplos arquivos, se existirem
    if (req.files) {
      // Para arrays de arquivos (array de arquivos do mesmo campo)
      if (Array.isArray(req.files)) {
        console.log('Moderando array de arquivos, quantidade:', req.files.length);
        req.files.forEach(file => {
          if (file.path) {
            filesToModerate.push({ 
              path: file.path, 
              fieldname: file.fieldname 
            });
          } else if (file.buffer) {
            filesToModerate.push({ 
              buffer: file.buffer, 
              fieldname: file.fieldname,
              mimetype: file.mimetype
            });
          }
        });
      } 
      // Para objetos de arquivos (campos diferentes)
      else {
        // Aqui tipamos corretamente para evitar o erro
        const filesObj = req.files as Record<string, Express.Multer.File | Express.Multer.File[]>;
        
        Object.keys(filesObj).forEach(fieldname => {
          const fieldFiles = filesObj[fieldname];
          if (Array.isArray(fieldFiles)) {
            fieldFiles.forEach(file => {
              if (file.path) {
                filesToModerate.push({ 
                  path: file.path, 
                  fieldname 
                });
              } else if (file.buffer) {
                filesToModerate.push({ 
                  buffer: file.buffer, 
                  fieldname,
                  mimetype: file.mimetype
                });
              }
            });
          } else if (fieldFiles) {
            // Caso seja um único arquivo
            if (fieldFiles.path) {
              filesToModerate.push({ 
                path: fieldFiles.path, 
                fieldname 
              });
            } else if (fieldFiles.buffer) {
              filesToModerate.push({ 
                buffer: fieldFiles.buffer, 
                fieldname,
                mimetype: fieldFiles.mimetype
              });
            }
          }
        });
      }
    }
    
    // Se não houver arquivos para moderar, prosseguir
    if (filesToModerate.length === 0) {
      return next();
    }
    
    // Moderar cada arquivo
    for (const file of filesToModerate) {
      let result;
      
      // Moderação baseada em caminho no disco
      if (file.path) {
        // Verificar se é uma imagem
        const fileExtension = path.extname(file.path).toLowerCase();
        const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExtension);
        
        if (!isImage) {
          console.log(`Arquivo ${file.path} não é uma imagem, pulando moderação`);
          continue; // Pular arquivos que não são imagens
        }
        
        console.log(`Iniciando moderação da imagem em disco: ${file.path}`);
        
        // Moderar a imagem
        result = await moderateImage(file.path);
        
        console.log(`Resultado da moderação para ${file.path}:`, result.isFlagged ? 'REJEITADO' : 'APROVADO');
      } 
      // Moderação baseada em buffer na memória
      else if (file.buffer && file.mimetype) {
        // Verificar se é uma imagem
        if (!file.mimetype.startsWith('image/')) {
          console.log(`Arquivo com mimetype ${file.mimetype} não é uma imagem, pulando moderação`);
          continue; // Pular arquivos que não são imagens
        }
        
        console.log(`Iniciando moderação da imagem em buffer (${file.buffer.length} bytes)`);
        
        // Moderar o buffer da imagem
        result = await moderateImageBuffer(file.buffer, file.mimetype);
        
        console.log(`Resultado da moderação do buffer:`, result.isFlagged ? 'REJEITADO' : 'APROVADO');
      } else {
        console.warn('Arquivo sem dados para moderação (nem path nem buffer), pulando');
        continue;
      }
      
      // Se a imagem for sinalizada como imprópria, rejeitar a requisição
      if (result.isFlagged) {
        console.log(`Imagem imprópria detectada`);
        
        // Excluir a imagem do servidor se for um arquivo em disco
        if (file.path) {
          try {
            fs.unlinkSync(file.path);
            console.log(`Imagem imprópria excluída: ${file.path}`);
          } catch (unlinkError) {
            console.error('Erro ao excluir imagem imprópria:', unlinkError);
          }
        }
        
        return res.status(400).json({
          success: false,
          message: 'Imagem com conteúdo impróprio detectado. Por favor, envie uma imagem apropriada.',
          details: {
            field: file.fieldname,
            unsafeContent: result.unsafeContent,
            safetyScores: result.safetyScores
          }
        });
      }
    }
    
    // Se todas as imagens passarem na moderação, prosseguir
    next();
      } catch (error) {
    console.error('Erro no middleware de moderação de imagem:', error);
    
    // Em caso de erro no middleware, NÃO permitir a continuação para garantir segurança
    return res.status(500).json({
      success: false,
      message: 'Erro durante a verificação de segurança da imagem. Por favor, tente novamente.'
    });
  }
};