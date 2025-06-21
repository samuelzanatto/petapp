import { Request, Response } from 'express';
import { PrismaClient, PetSpecies } from '@prisma/client';
import { config } from '../config';

// Usar a configuração dinâmica em vez de um IP hardcoded
const API_URL = config.baseUrl;

const prisma = new PrismaClient();

export const createPet = async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      nickname,
      species, 
      breed, 
      birthdate,
      age,
      furType,
      primaryColor,
      secondaryColor,
      distinguishingMarks,
      weight,
      size,
      hasDisability,
      disabilityDetails,
      takesRegularMedication,
      medicationDetails,
      hasSpecialDiet,
      dietDetails,
      isNeutered,
      microchipNumber,
      microchipLocation,
      veterinarianContact,
      temperament,
      isTrainedToCommands,
      reactsTo,
      description
    } = req.body;
    const ownerId = req.userId;

    if (!ownerId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Validação dos campos obrigatórios
    if (!name || !species) {
      return res.status(400).json({ message: 'Nome e espécie são obrigatórios' });
    }

    // Verificar se a espécie é válida
    if (!Object.values(PetSpecies).includes(species as PetSpecies)) {
      return res.status(400).json({ message: 'Espécie inválida. Use DOG ou CAT.' });
    }

    // Processar imagem do pet
    let imagePath = null;
    if (req.file) {
      imagePath = req.file.path.replace(/\\/g, '/'); // Normalizar caminho para URLs
    }

    // Converter valores booleanos de string para boolean
    const booleanFields = {
      hasDisability: hasDisability === 'true',
      takesRegularMedication: takesRegularMedication === 'true',
      hasSpecialDiet: hasSpecialDiet === 'true',
      isNeutered: isNeutered === 'true',
      isTrainedToCommands: isTrainedToCommands === 'true'
    };

    // Converter valores numéricos
    const numericFields = {
      age: age ? parseInt(age) : null,
      weight: weight ? parseFloat(weight) : null
    };

    const pet = await prisma.pet.create({
      data: {
        name,
        nickname,
        species: species as PetSpecies,
        breed,
        birthdate: birthdate ? new Date(birthdate) : null,
        age: numericFields.age,
        furType,
        primaryColor,
        secondaryColor,
        distinguishingMarks,
        weight: numericFields.weight,
        size,
        hasDisability: booleanFields.hasDisability,
        disabilityDetails,
        takesRegularMedication: booleanFields.takesRegularMedication,
        medicationDetails,
        hasSpecialDiet: booleanFields.hasSpecialDiet,
        dietDetails,
        isNeutered: booleanFields.isNeutered,
        microchipNumber,
        microchipLocation,
        veterinarianContact,
        temperament,
        isTrainedToCommands: booleanFields.isTrainedToCommands,
        reactsTo,
        description,
        ownerId: ownerId as string,
        primaryImage: imagePath
      }
    });

    // Retornar URLs completos para imagens
    if (pet.primaryImage && !pet.primaryImage.startsWith('http')) {
      pet.primaryImage = `${req.protocol}://${req.get('host')}/${pet.primaryImage}`;
    }

    res.status(201).json(pet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar pet' });
  }
};

export const getUserPets = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const pets = await prisma.pet.findMany({
      where: {
        ownerId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json(pets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar pets do usuário' });
  }
};

// Adicione esta função ao arquivo pet.controller.ts
export const getAllPets = async (req: Request, res: Response) => {
  try {
    const pets = await prisma.pet.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        }
      },
      take: 50
    });

    // Formatar os URLs das imagens para URLs completas
    const formattedPets = pets.map(pet => ({
      ...pet,
      primaryImage: pet.primaryImage 
        ? pet.primaryImage.startsWith('http') 
          ? pet.primaryImage 
          : `${API_URL}/${pet.primaryImage.replace(/\\/g, '/')}`
        : null
    }));

    res.status(200).json(formattedPets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar todos os pets' });
  }
};

export const getPetById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pet = await prisma.pet.findUnique({
      where: {
        id
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            phone: true,
            whatsappPhone: true,
            emergencyPhone: true,
            emergencyContact: true
          }
        }
      }
    });

    if (!pet) {
      return res.status(404).json({ message: 'Pet não encontrado' });
    }

    // Formatar as URLs das imagens para URLs completas
    const formattedPet = {
      ...pet,
      // Formatar a imagem primária
      primaryImage: pet.primaryImage 
        ? pet.primaryImage.startsWith('http') 
          ? pet.primaryImage 
          : `${API_URL}/${pet.primaryImage.replace(/\\/g, '/')}`
        : null,
      // Certificar-se de que o campo images existe (adaptar conforme seu modelo)
      images: pet.images 
        ? pet.images.map(img => 
            img.startsWith('http') ? img : `${API_URL}/${img.replace(/\\/g, '/')}`)
        : [],
      // Formatar a imagem do proprietário também
      owner: {
        ...pet.owner,
        profileImage: pet.owner.profileImage
          ? pet.owner.profileImage.startsWith('http')
            ? pet.owner.profileImage
            : `${API_URL}/${pet.owner.profileImage.replace(/\\/g, '/')}`
          : null
      },
      // Garantir que gender seja incluído mesmo que null
      gender: pet.gender || null
    };

    res.status(200).json(formattedPet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar detalhes do pet' });
  }
};

export const updatePet = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      nickname,
      species, 
      breed, 
      birthdate,
      age,
      furType,
      primaryColor,
      secondaryColor,
      distinguishingMarks,
      weight,
      size,
      hasDisability,
      disabilityDetails,
      takesRegularMedication,
      medicationDetails,
      hasSpecialDiet,
      dietDetails,
      isNeutered,
      microchipNumber,
      microchipLocation,
      veterinarianContact,
      temperament,
      isTrainedToCommands,
      reactsTo,
      description
    } = req.body;
    const userId = req.userId;

    // Verificar se o pet existe e pertence ao usuário
    const pet = await prisma.pet.findUnique({
      where: { id }
    });

    if (!pet) {
      return res.status(404).json({ message: 'Pet não encontrado' });
    }

    if (pet.ownerId !== userId) {
      return res.status(403).json({ message: 'Você não tem permissão para atualizar este pet' });
    }

    // Processar imagens do pet - agora trabalhando com múltiplas imagens
    let imagePaths = undefined;
    let primaryImage = undefined;
    
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      // Capturar todos os caminhos das imagens
      imagePaths = req.files.map(file => file.path.replace(/\\/g, '/'));
      
      // Definir a primeira imagem como primária se solicitado pelo cliente
      // ou se não houver uma imagem primária definida
      if (!pet.primaryImage || req.body.primaryImageIndex === '0') {
        primaryImage = imagePaths[0];
      }
    }

    // Converter valores booleanos de string para boolean
    const booleanFields: any = {};
    if (hasDisability !== undefined) booleanFields.hasDisability = hasDisability === 'true';
    if (takesRegularMedication !== undefined) booleanFields.takesRegularMedication = takesRegularMedication === 'true';
    if (hasSpecialDiet !== undefined) booleanFields.hasSpecialDiet = hasSpecialDiet === 'true';
    if (isNeutered !== undefined) booleanFields.isNeutered = isNeutered === 'true';
    if (isTrainedToCommands !== undefined) booleanFields.isTrainedToCommands = isTrainedToCommands === 'true';

    // Converter valores numéricos
    const numericFields: any = {};
    if (age !== undefined) numericFields.age = age ? parseInt(age) : null;
    if (weight !== undefined) numericFields.weight = weight ? parseFloat(weight) : null;

    // Preparar dados para atualização
    const updateData: any = {
      ...booleanFields,
      ...numericFields
    };

    // Adicionar os campos de texto apenas se não forem undefined
    if (name !== undefined) updateData.name = name;
    if (nickname !== undefined) updateData.nickname = nickname;
    if (species !== undefined) updateData.species = species;
    if (breed !== undefined) updateData.breed = breed;
    if (birthdate !== undefined) updateData.birthdate = birthdate ? new Date(birthdate) : null;
    if (furType !== undefined) updateData.furType = furType;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (distinguishingMarks !== undefined) updateData.distinguishingMarks = distinguishingMarks;
    if (size !== undefined) updateData.size = size;
    if (disabilityDetails !== undefined) updateData.disabilityDetails = disabilityDetails;
    if (medicationDetails !== undefined) updateData.medicationDetails = medicationDetails;
    if (dietDetails !== undefined) updateData.dietDetails = dietDetails;
    if (microchipNumber !== undefined) updateData.microchipNumber = microchipNumber;
    if (microchipLocation !== undefined) updateData.microchipLocation = microchipLocation;
    if (veterinarianContact !== undefined) updateData.veterinarianContact = veterinarianContact;
    if (temperament !== undefined) updateData.temperament = temperament;
    if (reactsTo !== undefined) updateData.reactsTo = reactsTo;
    if (description !== undefined) updateData.description = description;

    // Adicionar imagens se foram enviadas
    if (imagePaths && imagePaths.length > 0) {
      // Se o pet já tinha imagens, adicionar às existentes
      if (pet.images && Array.isArray(pet.images) && pet.images.length > 0) {
        updateData.images = {
          push: imagePaths
        };
      } else {
        // Se não tinha imagens, definir o array
        updateData.images = imagePaths;
      }
    }

    // Atualizar imagem primária se definida
    if (primaryImage) {
      updateData.primaryImage = primaryImage;
    }
    
    // Verificar se há um índice de imagem primária na requisição
    const primaryImageIndex = req.body.primaryImageIndex;
    if (primaryImageIndex !== undefined && pet.images && Array.isArray(pet.images)) {
      const index = parseInt(primaryImageIndex);
      if (!isNaN(index) && index >= 0 && index < pet.images.length) {
        updateData.primaryImage = pet.images[index];
      }
    }

    const updatedPet = await prisma.pet.update({
      where: { id },
      data: updateData
    });

    // Retornar URLs completos para imagens
    if (updatedPet.primaryImage && !updatedPet.primaryImage.startsWith('http')) {
      updatedPet.primaryImage = `${req.protocol}://${req.get('host')}/${updatedPet.primaryImage}`;
    }

    res.status(200).json(updatedPet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar pet' });
  }
};

export const deletePet = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Verificar se o pet existe e pertence ao usuário
    const pet = await prisma.pet.findUnique({
      where: {
        id
      }
    });

    if (!pet) {
      return res.status(404).json({ message: 'Pet não encontrado' });
    }

    if (pet.ownerId !== userId) {
      return res.status(403).json({ message: 'Você não tem permissão para excluir este pet' });
    }

    await prisma.pet.delete({
      where: {
        id
      }
    });

    res.status(200).json({ message: 'Pet excluído com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir pet' });
  }
};