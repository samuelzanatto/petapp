import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { getImageUrl } from '@/utils/imageUtils';
import { Platform } from 'react-native';

type User = {
  id: string;
  name: string;
  profileImage: string | null;
};

type Pet = {
  id: string;
  name: string;
  species: 'DOG' | 'CAT';
  primaryImage: string | null;
};

type Post = {
  id: string;
  caption: string | null;
  image: string;
  userId: string;
  petId: string | null;
  likesCount: number;
  commentsCount: number;
  hasLiked: boolean;
  createdAt: string;
  updatedAt: string;
  user: User;
  pet: Pet | null;
};

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await api.get('/posts');
      
      // Formatar URLs das imagens
      const formattedPosts = data.map((post: any) => ({
        ...post,
        image: getImageUrl(post.image),
        user: {
          ...post.user,
          profileImage: getImageUrl(post.user.profileImage)
        },
        pet: post.pet ? {
          ...post.pet,
          primaryImage: getImageUrl(post.pet.primaryImage)
        } : null
      }));
      
      setPosts(formattedPosts);
    } catch (error: any) {
      setError(error.message || 'Erro ao carregar posts');
      console.error('Erro ao buscar posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const likePost = async (postId: string) => {
    try {
      // Encontrar o post atual e verificar seu estado de curtida
      const currentPost = posts.find(post => post.id === postId);
      if (!currentPost) return false;

      const isCurrentlyLiked = currentPost.hasLiked || false;
      const wasLikedBefore = currentPost.hasLiked || false;
      
      // Se o post já está curtido, não faça nada além de atualizar a UI local
      if (isCurrentlyLiked) {
        return true;
      }
      
      // Atualizar o estado local dos posts imediatamente (abordagem otimista)
      const newLikeStatus = true; // Sempre true pois só permitimos curtir, não descurtir
      
      setPosts(posts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              hasLiked: newLikeStatus, 
              likesCount: post.likesCount + 1
            } 
          : post
      ));
      
      // Chamar a API apenas se o status de curtida estiver mudando em relação ao estado original
      // Isso evita múltiplas requisições desnecessárias ao servidor
      if (newLikeStatus !== wasLikedBefore) {
        const response = await api.post(`/posts/${postId}/like`, {});
        return response.liked;
      }
      
      // Retornamos o novo status de curtida independente de ter chamado a API
      return newLikeStatus;
    } catch (err) {
      console.error('Erro ao curtir post:', err);
      
      // Em caso de erro, reverter o estado
      const currentPost = posts.find(post => post.id === postId);
      const isCurrentlyLiked = currentPost?.hasLiked || false;
      
      setPosts(posts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              hasLiked: false, 
              likesCount: Math.max(0, post.likesCount - 1)
            } 
          : post
      ));
      
      throw err;
    }
  };

  const createPost = async (
    caption: string, 
    image: string, 
    petId?: string
  ) => {
    try {
      console.log('Criando post com imagem:', image);

      // Preparar o FormData
      const formData = new FormData();
      formData.append('caption', caption);
      if (petId) formData.append('petId', petId);

      // Extrair informações do arquivo
      const filename = image.split('/').pop() || `photo_${Date.now()}.jpg`;
      const fileExt = image.split('.').pop() || 'jpg';

      // Adicionar a imagem ao FormData
      // @ts-ignore - React Native's FormData differes from standard web FormData
      formData.append('image', {
        uri: Platform.OS === 'android' ? image : image.replace('file://', ''),
        name: filename,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
      } as any);

      console.log('Enviando FormData para o servidor...');
      const response = await api.post('/posts', formData, {
        'Content-Type': 'multipart/form-data',
      });
      console.log('Resposta do servidor:', response);

      // Atualizar a lista de posts
      await fetchPosts();

      return response;
    } catch (err) {
      console.error('Erro ao criar post:', err);
      throw err;
    }
  };

  const createPostWithBase64 = async (
    caption: string, 
    imageBase64: string, 
    petId?: string
  ) => {
    try {
      setLoading(true);
  
      // Criar o post com a imagem em base64
      const postData = {
        caption,
        petId: petId || null,
        imageBase64 // Enviar a imagem como base64
      };
      
      const result = await api.post('/posts/upload-base64', postData);
      
      // Atualizar a lista de posts
      setPosts(prev => [result, ...prev]);
      
      return result;
    } catch (error) {
      console.error('Erro ao criar post com base64:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const commentOnPost = async (postId: string, comment: string) => {
    try {
      const response = await api.post(`/posts/${postId}/comments`, { content: comment });
      
      // Atualizar o estado local dos posts com a nova contagem de comentários
      setPosts(posts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              commentsCount: post.commentsCount + 1
            } 
          : post
      ));
      
      return response;
    } catch (err) {
      console.error('Erro ao comentar no post:', err);
      throw err;
    }
  };

  const refreshPosts = () => {
    setRefreshing(true);
    fetchPosts();
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return { 
    posts, 
    loading, 
    error, 
    refreshing,
    refreshPosts,
    likePost,
    commentOnPost,
    createPost,
    createPostWithBase64
  };
};