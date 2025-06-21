import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { useFollow } from '@/hooks/useFollow';
import { getImageUrl } from '@/utils/imageUtils';
import { useAuth } from '@/contexts/auth';
import { FontFamily, Typography } from '@/constants/Fonts';

// Atualizado para incluir isFollowing
type FollowUser = {
  id: string;
  name: string;
  profileImage: string | null;
  followedAt: string;
  isFollowing?: boolean;
};

export default function FollowingScreen() { // Nome corrigido
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const { user } = useAuth(); // Obter usuário logado
  const { loading: followLoading, following, fetchFollowing, toggleFollow } = useFollow();
  const [refreshing, setRefreshing] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [followingData, setFollowingData] = useState<FollowUser[]>([]);

  useEffect(() => {
    if (id) {
      loadFollowing();
    }
  }, [id]);
  
  // Atualizar estado local quando os seguindo mudarem
  useEffect(() => {
    setFollowingData(following);
  }, [following]);

  const loadFollowing = async () => {
    if (!id) return;
    
    try {
      setLocalLoading(true);
      
      const data = await fetchFollowing(id as string);
      
      console.log(`Carregados ${data.length} usuários seguidos`);
    } catch (error) {
      console.error('Erro ao carregar usuários seguidos:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de usuários seguidos.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFollowing();
    setRefreshing(false);
  };

  // Implementar função para seguir/deixar de seguir
  const handleToggleFollow = async (userId: string) => {
    try {
      // Encontrar o usuário na lista
      const userIndex = followingData.findIndex(following => following.id === userId);
      if (userIndex === -1) return;
      
      const currentlyFollowing = followingData[userIndex].isFollowing || false;
      
      // Atualizar UI imediatamente (otimista)
      const updatedFollowing = [...followingData];
      updatedFollowing[userIndex] = {
        ...updatedFollowing[userIndex],
        isFollowing: !currentlyFollowing
      };
      setFollowingData(updatedFollowing);
      
      // Chamar a API
      const success = await toggleFollow(userId, currentlyFollowing);
      
      // Se falhar, reverter a UI
      if (success !== !currentlyFollowing) {
        const revertedFollowing = [...followingData];
        revertedFollowing[userIndex] = {
          ...revertedFollowing[userIndex],
          isFollowing: currentlyFollowing
        };
        setFollowingData(revertedFollowing);
      }
    } catch (error) {
      console.error('Erro ao alternar seguir:', error);
      Alert.alert('Erro', 'Não foi possível realizar esta ação.');
    }
  };

  const renderFollowingItem = ({ item }: { item: FollowUser }) => (
    <ThemedCard style={styles.followerItem}>
      <TouchableOpacity 
        style={styles.followerLeftContainer}
        onPress={() => router.push(`/profile/${item.id}`)}
      >
        <Image 
          source={
            item.profileImage 
              ? { uri: getImageUrl(item.profileImage) } 
              : require('@/assets/images/default-avatar.png')
          }
          style={styles.avatar}
        />
        <View style={styles.followerInfo}>
          <ThemedText style={styles.followerName}>{item.name}</ThemedText>
          <ThemedText type="small" style={styles.followDate}>
            Segue desde {new Date(item.followedAt).toLocaleDateString()}
          </ThemedText>
        </View>
      </TouchableOpacity>
      
      {/* Não mostrar botão de seguir para o próprio usuário */}
      {item.id !== user?.id && (
        <TouchableOpacity 
          style={[
            styles.followButtonContainer, 
            styles.followingButtonContainer
          ]}
          onPress={() => handleToggleFollow(item.id)}
        >
          <ThemedText style={[
            styles.followButtonText,
            styles.followingButtonText
          ]}>
            Seguindo
          </ThemedText>
        </TouchableOpacity>
      )}
    </ThemedCard>
  );
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="default" style={styles.headerTitle}>Seguindo</ThemedText>
        <View style={{width: 24}} />
      </View>      

      {(localLoading || followLoading) && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <ThemedText style={styles.loadingText}>Carregando usuários seguidos...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={followingData}
          renderItem={renderFollowingItem}
          keyExtractor={item => item.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color={colors.textTertiary} />
              <ThemedText style={[styles.emptyText, { color: colors.textTertiary }]}>
                Não segue ninguém ainda
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// Os estilos são iguais aos da tela de seguidores
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 0,
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: FontFamily.medium,
    color: '#888',
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 16,
  },
  followerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
  },
  followerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  followerName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    marginBottom: 3,
  },
  followDate: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  followButtonContainer: {
    backgroundColor: '#ED5014',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#ED5014',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  followingButtonContainer: {
    backgroundColor: 'transparent',
    borderColor: '#ED5014',
    borderWidth: 1,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  followButtonText: {
    color: '#FFF',
    fontFamily: FontFamily.medium,
    fontSize: 14,
  },
  followingButtonText: {
    color: '#ED5014',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
    marginTop: 50,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: FontFamily.medium,
  },
});