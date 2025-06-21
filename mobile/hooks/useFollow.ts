import { useState, useCallback } from 'react';
import { api } from '@/services/api';
import { Alert } from 'react-native';

type FollowUser = {
  id: string;
  name: string;
  profileImage: string | null;
  followedAt: string;
};

export function useFollow() {
  const [loading, setLoading] = useState(false);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);

  const toggleFollow = useCallback(async (userId: string, currentlyFollowing: boolean) => {
    try {
      setLoading(true);
      
      // Chamada à API para seguir/deixar de seguir
      const response = await api.post(`/users/follow/${userId}`);
      
      console.log('Toggle follow response:', response);
      
      // Retorna se agora está seguindo ou não
      return response.following;
    } catch (error) {
      console.error('Erro ao seguir/deixar de seguir:', error);
      Alert.alert('Erro', 'Não foi possível realizar esta ação. Tente novamente.');
      return currentlyFollowing; // Manter estado anterior em caso de erro
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFollowers = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      
      const response = await api.get(`/users/followers/${userId}`);
      
      console.log(`Buscados ${response.length} seguidores para o usuário ${userId}`);
      setFollowers(response);
      
      return response;
    } catch (error) {
      console.error('Erro ao buscar seguidores:', error);
      setFollowers([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFollowing = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      
      const response = await api.get(`/users/following/${userId}`);
      
      console.log(`Buscados ${response.length} usuários seguidos pelo usuário ${userId}`);
      setFollowing(response);
      
      return response;
    } catch (error) {
      console.error('Erro ao buscar usuários seguidos:', error);
      setFollowing([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    followers,
    following,
    toggleFollow,
    fetchFollowers,
    fetchFollowing
  };
}