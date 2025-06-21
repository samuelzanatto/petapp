import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { uploadPetImage } from '../utils/imageUpload';
import { getImageUrl } from '@/utils/imageUtils';
import { Platform } from 'react-native';

type Pet = {
  id: string;
  name: string;
  species: 'DOG' | 'CAT';
  breed?: string;
  birthdate?: string;
  primaryImage: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export function usePets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/pets');
      
      const formattedPets = data.map((pet: Pet) => ({
        ...pet,
        primaryImage: getImageUrl(pet.primaryImage)
      }));
      
      setPets(formattedPets);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar pets');
      console.error('Erro ao buscar pets:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getUserPets = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/users/${userId}/pets`);
      return data;
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar pets do usuário');
      console.error('Erro ao buscar pets do usuário:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createPet = async (petData: {
    name: string;
    species: 'DOG' | 'CAT';
    breed?: string;
    birthdate?: string;
    imageUri?: string;
    description?: string;
  }) => {
    try {
      // Criar um FormData para enviar tanto os dados quanto a imagem
      const formData = new FormData();
      formData.append('name', petData.name);
      formData.append('species', petData.species);
      
      if (petData.breed) {
        formData.append('breed', petData.breed);
      }
      
      if (petData.description) {
        formData.append('description', petData.description);
      }
      
      // Anexar a imagem ao FormData se ela existir
      if (petData.imageUri) {
        const filename = petData.imageUri.split('/').pop() || `pet_${Date.now()}.jpg`;
        const fileExt = petData.imageUri.split('.').pop() || 'jpg';
        
        // @ts-ignore - React Native's FormData differes from standard web FormData
        formData.append('image', {
          uri: Platform.OS === 'android' ? petData.imageUri : petData.imageUri.replace('file://', ''),
          name: filename,
          type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
        } as any);
      }
      
      // Usar o método post com headers multipart/form-data
      const data = await api.post('/pets', formData, {
        'Content-Type': 'multipart/form-data',
      });
      
      // Atualizar a lista de pets
      await fetchPets();
      
      return data;
    } catch (err: any) {
      console.error('Erro ao criar pet:', err);
      throw err;
    }
  };

  const updatePet = async (
    petId: string,
    petData: {
      name?: string;
      species?: 'DOG' | 'CAT';
      breed?: string;
      birthdate?: string;
      imageUri?: string;
      description?: string;
    }
  ) => {
    try {
      if (petData.imageUri) {
        // Se tiver nova imagem, usar FormData
        const formData = new FormData();
        
        // Adicionar todos os campos de texto
        Object.keys(petData).forEach(key => {
          if (key !== 'imageUri' && petData[key] !== undefined) {
            formData.append(key, String(petData[key]));
          }
        });
        
        // Adicionar a imagem
        const filename = petData.imageUri.split('/').pop() || `pet_${Date.now()}.jpg`;
        const fileExt = petData.imageUri.split('.').pop() || 'jpg';
        
        // @ts-ignore - React Native's FormData differes from standard web FormData
        formData.append('image', {
          uri: Platform.OS === 'android' ? petData.imageUri : petData.imageUri.replace('file://', ''),
          name: filename,
          type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
        } as any);
        
        const data = await api.put(`/pets/${petId}`, formData, {
          'Content-Type': 'multipart/form-data',
        });
        
        // Atualizar a lista de pets
        await fetchPets();
        
        return data;
      } else {
        // Se não tiver nova imagem, enviar JSON normal
        const updateData = { ...petData };
        delete updateData.imageUri;
        
        const data = await api.put(`/pets/${petId}`, updateData);
        
        // Atualizar a lista de pets
        await fetchPets();
        
        return data;
      }
    } catch (err: any) {
      console.error('Erro ao atualizar pet:', err);
      throw err;
    }
  };

  const refreshPets = () => {
    setRefreshing(true);
    fetchPets();
  };

  useEffect(() => {
    fetchPets();
  }, []);

  return { 
    pets, 
    loading, 
    error,
    refreshing,
    refreshPets,
    getUserPets,
    createPet,
    updatePet 
  };
}