import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';

// Interface para tipagem dos resultados
interface PetFeature {
  name: string;
  confidence: number;
}

interface AnimalType {
  type: string;
  confidence: number;
}

interface PetFeatureResult {
  success: boolean;
  message?: string;
  features: PetFeature[];
  animalTypes: AnimalType[];
  error?: any;
}

// Inicializar o cliente do Vision API
// É necessário ter o arquivo de credenciais do Google Cloud configurado
let client: ImageAnnotatorClient;
try {  
  // Definir a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS com o caminho para o arquivo de credenciais
  process.env.GOOGLE_API_KEY = 'AIzaSyCsOMtON7aj0O_C3hRAGQgYnEpURJfteoA';
  
  // Inicializar o cliente com a chave de API
  client = new ImageAnnotatorClient({
    apiKey: process.env.GOOGLE_API_KEY
  });
  
  console.log('Cliente Google Vision inicializado com sucesso');
} catch (error) {
  console.error('Erro ao inicializar cliente Google Vision:', error);
  // Criar um cliente fictício para evitar erros de indefinição
  client = {} as ImageAnnotatorClient;
}

/**
 * Detecta características específicas em uma imagem de pet
 * @param imagePath Caminho local da imagem para analisar
 */
export const detectPetFeatures = async (imagePath: string): Promise<PetFeatureResult> => {
  try {
    // Garantir que o arquivo existe
    if (!fs.existsSync(imagePath)) {
      throw new Error('Arquivo de imagem não encontrado');
    }

    // Verificar se o cliente foi inicializado corretamente
    if (!client.objectLocalization || !client.labelDetection) {
      throw new Error('Cliente Google Vision não está disponível');
    }
    
    // Ler a imagem como um buffer de dados
    const imageBuffer = fs.readFileSync(imagePath);

    // Realizar detecção de objetos e rótulos
    const [objectDetection] = await client.objectLocalization({
      image: { content: imageBuffer }
    });
    const [labelDetection] = await client.labelDetection({
      image: { content: imageBuffer }
    });

    // Verificar se há um animal na imagem
    const objects = objectDetection.localizedObjectAnnotations || [];
    const isPetImage = objects.some(obj => 
      ['Dog', 'Cat', 'Animal', 'Carnivore', 'Mammal'].includes(obj.name || '')
    );

    if (!isPetImage) {
      return {
        success: false,
        message: 'Nenhum animal detectado na imagem',
        features: [],
        animalTypes: []
      };
    }

    // Extrair características relevantes da imagem
    const labels = labelDetection.labelAnnotations || [];
    const petFeatures = labels
      .filter(label => label.score && label.score > 0.7) // Apenas rótulos com alta confiança
      .map(label => ({
        name: label.description || '',
        confidence: label.score || 0
      }));

    return {
      success: true,
      features: petFeatures,
      // Incluir tipos de animais detectados
      animalTypes: objects
        .filter(obj => ['Dog', 'Cat', 'Animal'].includes(obj.name || ''))
        .map(obj => ({
          type: obj.name || '',
          confidence: obj.score || 0
        }))
    };
  } catch (error) {
    console.error('Erro ao analisar imagem:', error);
    return {
      success: false,
      message: 'Erro ao processar a imagem',
      features: [],
      animalTypes: [],
      error: error
    };
  }
};

/**
 * Compara duas imagens de pets para determinar a similaridade
 * @param image1Path Caminho da primeira imagem
 * @param image2Path Caminho da segunda imagem
 */
export const comparePetImages = async (image1Path: string, image2Path: string) => {
  try {
    console.log(`Iniciando comparação entre: ${image1Path} e ${image2Path}`);
    
    // Detectar características em ambas as imagens
    console.log('Analisando primeira imagem...');
    const features1 = await detectPetFeatures(image1Path);
    console.log(`Resultado da primeira imagem: ${features1.success ? 'Sucesso' : 'Falha'}`);
    if (features1.success) {
      console.log(`Tipo de animal: ${features1.animalTypes.map(a => `${a.type} (${(a.confidence * 100).toFixed(2)}%)`).join(', ') || 'Desconhecido'}`);
      console.log(`Características encontradas: ${features1.features.map(f => f.name).join(', ') || 'Nenhuma'}`);
    }
    
    console.log('Analisando segunda imagem...');
    const features2 = await detectPetFeatures(image2Path);
    console.log(`Resultado da segunda imagem: ${features2.success ? 'Sucesso' : 'Falha'}`);
    if (features2.success) {
      console.log(`Tipo de animal: ${features2.animalTypes.map(a => `${a.type} (${(a.confidence * 100).toFixed(2)}%)`).join(', ') || 'Desconhecido'}`);
      console.log(`Características encontradas: ${features2.features.map(f => f.name).join(', ') || 'Nenhuma'}`);
    }

    if (!features1.success || !features2.success) {
      console.log('Comparação falhou: não foi possível analisar uma ou ambas as imagens');
      return {
        success: false,
        message: 'Não foi possível analisar uma ou ambas as imagens',
        similarity: 0
      };
    }

    // Verificar se são do mesmo tipo de animal
    const animalType1 = features1.animalTypes[0]?.type || '';
    const animalType2 = features2.animalTypes[0]?.type || '';
    
    const sameAnimalType = 
      (animalType1 === animalType2) || 
      (animalType1 === 'Animal' && ['Dog', 'Cat'].includes(animalType2)) ||
      (animalType2 === 'Animal' && ['Dog', 'Cat'].includes(animalType1));
    
    console.log(`Comparação de tipos de animal: ${animalType1} vs ${animalType2} - São iguais? ${sameAnimalType}`);
    
    if (!sameAnimalType) {
      console.log('Comparação concluída: animais diferentes');
      return {
        success: true,
        message: 'As imagens parecem ser de animais diferentes',
        similarity: 0.1
      };
    }

    // Comparar características
    const features1Set = new Set(features1.features.map(f => f.name.toLowerCase()));
    const features2Set = new Set(features2.features.map(f => f.name.toLowerCase()));

    // Encontrar intersecção de características
    const intersection = new Set(
      [...features1Set].filter(feature => features2Set.has(feature))
    );

    // Calcular similaridade baseada em características comuns
    const union = new Set([...features1Set, ...features2Set]);
    const similarity = intersection.size / union.size;
    
    console.log(`Características na imagem 1: ${features1Set.size}`);
    console.log(`Características na imagem 2: ${features2Set.size}`);
    console.log(`Características em comum: ${intersection.size}`);
    console.log(`Características únicas (união): ${union.size}`);
    console.log(`Similaridade calculada: ${(similarity * 100).toFixed(2)}%`);
    console.log(`Características em comum: ${Array.from(intersection).join(', ')}`);

    return {
      success: true,
      similarity: similarity,
      commonFeatures: Array.from(intersection),
      message: similarity > 0.5 
        ? 'As imagens parecem ser do mesmo animal' 
        : 'As imagens provavelmente são de animais diferentes'
    };
  } catch (error) {
    console.error('Erro ao comparar imagens:', error);
    return {
      success: false,
      message: 'Erro ao comparar as imagens',
      similarity: 0,
      error: error
    };
  }
};