import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ScrollView,
  Alert
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../../utils/imageUtils';
import { useTheme } from '@/contexts/theme';
import { useFollow } from '@/hooks/useFollow';
import { useAuth } from '@/contexts/auth';
import { ThemedText } from '@/components/ThemedText';
import { CustomAlert } from '@/components/CustomAlert';

const { width } = Dimensions.get('window');

type User = {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  bio: string | null;
};

type Pet = {
  id: string;
  name: string;
  species: 'DOG' | 'CAT';
  primaryImage: string | null;
};

type Post = {
  id: string;
  image: string;
  caption: string | null;
  createdAt: string;
  likesCount: number;
};

export default function UserProfile() {
  const { id } = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const { colors, isDark } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'pets'>('posts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { loading: followLoading, toggleFollow, fetchFollowers, fetchFollowing } = useFollow();
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followButtonLoading, setFollowButtonLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [chatAlertVisible, setChatAlertVisible] = useState(false);
  const [chatAlertMessage, setChatAlertMessage] = useState('');

  const isOwnProfile = currentUser?.id === id;

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      console.log(`Buscando perfil do usuário: ${id}`);

      // Buscar dados do usuário
      const userData = await api.get(`/users/profile/${id}`);
      console.log('Dados do usuário recebidos:', userData);

      // Formatar URL da imagem de perfil
      const formattedUser = {
        ...userData,
        profileImage: getImageUrl(userData.profileImage)
      };

      setUser(formattedUser);

      // Buscar dados de seguidores (será implementado posteriormente)
      try {
        const followersData = await fetchFollowers(id as string);
        setFollowersCount(followersData.length || 0);
      } catch (error) {
        console.error('Erro ao buscar seguidores:', error);
        setFollowersCount(0);
      }

      try {
        const followingData = await fetchFollowing(id as string);
        setFollowingCount(followingData.length || 0);
      } catch (error) {
        console.error('Erro ao buscar seguindo:', error);
        setFollowingCount(0);
      }

      // Buscar posts do usuário
      try {
        const userPosts = await api.get(`/posts/user/${id}`);

        // Formatar URLs das imagens dos posts
        const formattedPosts = userPosts.map((post: any) => ({
          ...post,
          image: getImageUrl(post.image)
        }));

        setPosts(formattedPosts);
      } catch (error) {
        console.error('Erro ao buscar posts:', error);
        setPosts([]);
      }

      // Buscar pets do usuário (CORRIGIDO)
      try {
        const userPets = await api.get(`/users/${id}/pets`);

        // Formatar URLs das imagens dos pets
        const formattedPets = userPets.map((pet: any) => ({
          ...pet,
          primaryImage: getImageUrl(pet.primaryImage)
        }));

        setPets(formattedPets);
      } catch (error) {
        console.error('Erro ao buscar pets:', error);
        setPets([]);
      }
      setIsFollowing(userData.isFollowing || false);
    } catch (error: any) {
      console.error('Erro ao carregar perfil do usuário:', error);
      setError('Não foi possível carregar o perfil deste usuário');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOwnProfile) {
      console.log('Redirecionando para o perfil próprio');
      router.navigate('/(tabs)/profile');
      return;
    }
    
    fetchUserProfile();
  }, [id, isOwnProfile]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
  };

  const handleFollow = async () => {
    if (followLoading || messageLoading) return;
    
    try {
      // Mostrar um loading enquanto processa
      setFollowButtonLoading(true);
      
      // Chamar a API para seguir/deixar de seguir
      const newFollowingStatus = await toggleFollow(id as string, isFollowing);
      
      // Atualizar o estado local
      setIsFollowing(newFollowingStatus);
      
      // Atualizar a contagem de seguidores
      setFollowersCount(prev => newFollowingStatus ? prev + 1 : prev - 1);
    } catch (error) {
      console.error('Erro ao seguir/deixar de seguir:', error);
    } finally {
      setFollowButtonLoading(false);
    }
  };

  const handleMessage = async () => {
    try {
      // Mostrar indicador de carregamento
      setMessageLoading(true);
      
      // Chamar a API para criar ou obter uma sala de chat direto
      const response = await api.get(`/chat/direct/${id}`);
      
      if (response.chatRoomId) {
        // Navegar para a sala de chat existente
        router.push(`/chat/${response.chatRoomId}`);
      } else {
        // Exibir o alerta personalizado em vez do Alert padrão
        setChatAlertMessage('Não foi possível iniciar o chat.');
        setChatAlertVisible(true);
      }
    } catch (error: any) {
      console.error('Erro ao iniciar chat:', error);
      
      // Verificar se o erro está relacionado à falta de reivindicação aprovada
      if (error.response && error.response.status === 403) {
        setChatAlertMessage('Você só pode iniciar um chat com este usuário se existir uma reivindicação aprovada entre vocês.');
      } else {
        setChatAlertMessage('Ocorreu um problema ao iniciar o chat. Tente novamente mais tarde.');
      }
      
      setChatAlertVisible(true);
    } finally {
      setMessageLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={styles.loadingText}>Carregando perfil...</ThemedText>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={50} color={colors.error} />
        <ThemedText type="title" style={styles.errorTitle}>Erro</ThemedText>
        <ThemedText style={styles.errorMessage}>{error}</ThemedText>
        <TouchableOpacity 
          style={[styles.backButton, {
            backgroundColor: colors.accent,
            shadowColor: isDark ? 'rgba(237, 80, 20, 0.2)' : 'rgba(237, 80, 20, 0.3)',
          }]}
          onPress={() => router.back()}
        >
          <ThemedText style={[styles.backButtonText, { color: '#FFF' }]}>Voltar</ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderPostItem = ({ item }: { item: Post }) => (
    <TouchableOpacity 
      style={styles.postGridItem}
      onPress={() => router.push(`/post/${item.id}`)}
    >
      <Image 
        source={{ uri: item.image }} 
        style={styles.gridItemImage} 
        onError={(e) => console.error(`Erro ao carregar imagem: ${e.nativeEvent.error}`)}
      />
      {item.likesCount > 0 && (
        <View style={[styles.likesIndicator, {
          shadowColor: isDark ? 'rgba(0, 0, 0, 0.6)' : '#000',
        }]}>
          <Ionicons name="heart" size={12} color="#FFF" />
          <ThemedText style={styles.likesCount}>{item.likesCount}</ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderPetItem = ({ item }: { item: Pet }) => (
    <TouchableOpacity 
      style={styles.petGridItem}
      onPress={() => router.push(`/pet/${item.id}`)}
    >
      <Image 
        source={
          item.primaryImage 
            ? { uri: item.primaryImage } 
            : require('../../assets/images/default-pet.png')
        } 
        style={styles.gridItemImage} 
      />
      <View style={[styles.petNameOverlay, {
        backgroundColor: 'rgba(0,0,0,0.7)',
      }]}>
        <ThemedText style={styles.petName}>{item.name}</ThemedText>
        <ThemedText style={styles.petEmoji}>
          {item.species === 'DOG' ? '🐶' : '🐱'}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{user?.name}</ThemedText>
        <View style={{width: 24}} />
      </View>
      
      <ScrollView
        style={{ backgroundColor: colors.background }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            colors={[colors.primary]}
            tintColor={colors.primary}
            titleColor={colors.text}
            progressBackgroundColor={colors.card}
          />
        }
      >
        <View style={[styles.profileSection, { 
          backgroundColor: isDark ? colors.card : '#fff',
          borderRadius: 16,
          shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.1,
          shadowRadius: 6,
          elevation: 4,
          marginTop: 6,
          marginHorizontal: 16,
          marginBottom: 16,
        }]}>
          {/* Foto e Estatísticas */}
          <View style={styles.profileTop}>
            <Image 
              source={
                user?.profileImage 
                  ? { uri: user.profileImage } 
                  : require('../../assets/images/default-avatar.png')
              } 
              style={[styles.profileImage, { borderColor: colors.accent }]} 
            />
            
            <View style={styles.statsContainer}>
              <View style={[styles.statItem, { backgroundColor: isDark ? 'rgba(237, 80, 20, 0.08)' : 'rgba(237, 80, 20, 0.05)' }]}>
                <ThemedText style={[styles.statNumber, { color: colors.accent }]}>{posts.length}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</ThemedText>
              </View>
                        
              <TouchableOpacity 
                style={[styles.statItem, { backgroundColor: isDark ? 'rgba(237, 80, 20, 0.08)' : 'rgba(237, 80, 20, 0.05)' }]}
                onPress={() => router.push(`/follow/followers/${id}`)}
              >
                <ThemedText style={[styles.statNumber, { color: colors.accent }]}>{followersCount}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>Seguidores</ThemedText>
              </TouchableOpacity>
                        
              <TouchableOpacity 
                style={[styles.statItem, { backgroundColor: isDark ? 'rgba(237, 80, 20, 0.08)' : 'rgba(237, 80, 20, 0.05)' }]}
                onPress={() => router.push(`/follow/following/${id}`)}
              >
                <ThemedText style={[styles.statNumber, { color: colors.accent }]}>{followingCount}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>Seguindo</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Nome e Bio */}
          <View style={styles.bioContainer}>
            <ThemedText style={styles.userName}>{user?.name}</ThemedText>
            <ThemedText style={[styles.userBio, { color: colors.textSecondary }]}>
              {user?.bio || 'Sem biografia'}
            </ThemedText>
          </View>
          
          {/* Botões de ação */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  isFollowing 
                    ? [styles.followingButton, { 
                        backgroundColor: isDark ? colors.card : '#EFEFEF',
                        shadowColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)'
                      }] 
                    : [styles.followButton, { 
                        backgroundColor: colors.accent,
                        shadowColor: isDark ? 'rgba(237, 80, 20, 0.2)' : 'rgba(237, 80, 20, 0.3)'
                      }]
                ]}
                onPress={handleFollow}
                disabled={followButtonLoading}
              >
                {followButtonLoading ? (
                  <ActivityIndicator size="small" color={isFollowing ? colors.text : '#FFF'} />
                ) : (
                  <ThemedText style={[
                    styles.actionButtonText,
                    isFollowing 
                      ? { color: colors.text } 
                      : { color: '#FFF' }
                  ]}>
                    {isFollowing ? 'Seguindo' : 'Seguir'}
                  </ThemedText>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.messageButton, 
                  { 
                    backgroundColor: isDark ? colors.card : '#EFEFEF',
                    shadowColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)'
                  }
                ]}
                onPress={handleMessage}
                disabled={messageLoading}
              >
                {messageLoading ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Abas */}
        <View style={[styles.tabsContainer, { 
          borderColor: colors.border,
          backgroundColor: isDark ? colors.card : '#fff',
          borderRadius: 16,
          shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.1,
          shadowRadius: 6,
          elevation: 4,
          marginHorizontal: 16,
          marginBottom: 16,
        }]}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'posts' && [
                styles.activeTab, 
                { 
                  borderBottomColor: colors.accent,
                  backgroundColor: isDark ? 'rgba(237, 80, 20, 0.08)' : 'rgba(237, 80, 20, 0.05)'
                }
              ]
            ]}
            onPress={() => setActiveTab('posts')}
          >
            <Ionicons 
              name={activeTab === 'posts' ? "grid" : "grid-outline"} 
              size={22} 
              color={activeTab === 'posts' ? colors.accent : colors.textSecondary}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'pets' && [
                styles.activeTab, 
                { 
                  borderBottomColor: colors.accent,
                  backgroundColor: isDark ? 'rgba(237, 80, 20, 0.08)' : 'rgba(237, 80, 20, 0.05)'
                }
              ]
            ]}
            onPress={() => setActiveTab('pets')}
          >
            <Ionicons 
              name={activeTab === 'pets' ? "paw" : "paw-outline"} 
              size={22} 
              color={activeTab === 'pets' ? colors.accent : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        
        {/* Conteúdo baseado na aba selecionada */}
        <View style={{ backgroundColor: colors.background }}>
          {activeTab === 'posts' ? (
            posts.length > 0 ? (
              <FlatList
                key="posts-grid"
                data={posts}
                renderItem={renderPostItem}
                keyExtractor={item => item.id}
                numColumns={3}
                scrollEnabled={false}
                style={styles.gridContainer}
              />
            ) : (
              <View style={[styles.emptyContainer, {
                backgroundColor: isDark ? 'rgba(237, 80, 20, 0.08)' : 'rgba(237, 80, 20, 0.03)',
              }]}>
                <Ionicons name="images-outline" size={50} color={colors.textTertiary} />
                <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nenhuma publicação ainda
                </ThemedText>
              </View>
            )
          ) : (
            pets.length > 0 ? (
              <FlatList
                key="pets-grid"
                data={pets}
                renderItem={renderPetItem}
                keyExtractor={item => item.id}
                numColumns={2}
                scrollEnabled={false}
                style={styles.gridContainer}
              />
            ) : (
              <View style={[styles.emptyContainer, {
                backgroundColor: isDark ? 'rgba(237, 80, 20, 0.08)' : 'rgba(237, 80, 20, 0.03)',
              }]}>
                <Ionicons name="paw-outline" size={50} color={colors.textTertiary} />
                <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nenhum pet cadastrado
                </ThemedText>
              </View>
            )
          )}
        </View>
      </ScrollView>

      {/* Alerta personalizado para mensagens de chat */}
      <CustomAlert
        visible={chatAlertVisible}
        title="Chat não disponível"
        message={chatAlertMessage}
        onClose={() => setChatAlertVisible(false)}
        confirmText="Entendi"
        type="error"
        icon="chatbubble-ellipses"
      />
    </SafeAreaView>
  );
}

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
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontWeight: 'bold',
  },
  profileSection: {
    padding: 15,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 15,
  },
  statItem: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    minWidth: 60,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
  },
  bioContainer: {
    marginTop: 15,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userBio: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 15,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followButton: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  followingButton: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  messageButton: {
    width: 40,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonText: {
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 2,
  },  activeTab: {
    borderBottomWidth: 2,
  },
  gridContainer: {
    width: '100%',
    paddingHorizontal: 14,
    paddingTop: 2,
  },
  postGridItem: {
    flex: 1/3,
    aspectRatio: 1,
    padding: 1,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    margin: 1,
  },
  petGridItem: {
    flex: 1/2,
    aspectRatio: 1,
    padding: 1,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    margin: 1,
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  likesIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  likesCount: {
    color: '#FFF',
    fontSize: 10,
    marginLeft: 3,
  },
  petNameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  petName: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  petEmoji: {
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 50,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptyText: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
});