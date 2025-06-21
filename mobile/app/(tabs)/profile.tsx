import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  FlatList,
  RefreshControl,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { router } from 'expo-router';
import { api, getUserPosts } from '@/services/api';
import { getImageUrl } from '@/utils/imageUtils';
import { Loading } from '@/components/Loading';
import { useFollow } from '@/hooks/useFollow';
import { Colors } from '@/constants/Colors';
import LocationUpdateButton from '@/components/LocationUpdateButton';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

type Post = {
  id: string;
  image: string;
  caption: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    profileImage: string | null;
  };
  pet: {
    id: string;
    name: string;
    species: 'DOG' | 'CAT';
  } | null;
  likesCount: number;
  hasLiked: boolean;
};

export default function Profile() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [posts, setPosts] = useState<Post[]>([]);
  const [pets, setPets] = useState([]);
  const { fetchFollowers, fetchFollowing } = useFollow();
  const [following, setFollowing] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'posts' | 'pets'>('posts');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Adicionar logs para depuração
      console.log('Buscando dados do usuário:', user?.id);
      
      // Buscar posts e pets do usuário
      const userPostsResponse = await getUserPosts(user?.id || '');
      const userPetsResponse = await api.get('/pets');
      
      console.log('Posts recebidos:', userPostsResponse);
      console.log('Pets recebidos:', userPetsResponse);

      // Buscar contagem de seguidores e seguindo
      const followersData = await fetchFollowers(user?.id || '');
      const followingData = await fetchFollowing(user?.id || '');
      
      // Formatar URLs das imagens
      const formattedPosts = Array.isArray(userPostsResponse) 
        ? userPostsResponse.map((post: Post) => ({
            ...post,
            image: getImageUrl(post.image),
            user: {
              ...post.user,
              profileImage: post.user?.profileImage ? getImageUrl(post.user.profileImage) : null
            },
            pet: post.pet ? {
              ...post.pet,
              primaryImage: post.pet.primaryImage ? getImageUrl(post.pet.primaryImage) : null
            } : null
          }))
        : [];
      
      // Formatar URLs das imagens dos pets
      const formattedPets = Array.isArray(userPetsResponse) 
        ? userPetsResponse.map((pet) => ({
            ...pet,
            primaryImage: pet.primaryImage ? getImageUrl(pet.primaryImage) : null,
            images: Array.isArray(pet.images) 
              ? pet.images.map((img) => getImageUrl(img))
              : []
          }))
        : [];
      
      console.log('Posts formatados:', formattedPosts.length);
      console.log('Pets formatados:', formattedPets.length);
      
      setPosts(formattedPosts);
      setPets(formattedPets);
      setFollowers(followersData?.length || 0);
      setFollowing(followingData?.length || 0);
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    profileInfoContainer: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 35 : 30,
      paddingBottom: 20,
    },
    avatarContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 2,
      borderColor: isDark ? colors.accent : '#FFFFFF',
      overflow: 'hidden',
      backgroundColor: '#333',
      alignSelf: 'center',
      marginBottom: 15,
    },
    profileImage: {
      width: '100%',
      height: '100%',
    },
    nameContainer: {
      alignItems: 'center',
      marginBottom: 5,
    },
    name: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 3,
      textAlign: 'center',
    },
    email: {
      fontSize: 14,
      marginBottom: 15,
      textAlign: 'center',
      opacity: 0.7,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginVertical: 15,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 1)',
      overflow: 'hidden',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    statItem: {
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 10,
      flex: 1,
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.accent,
    },
    statLabel: {
      fontSize: 12,
      opacity: 0.7,
    },
    buttonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 15,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 16,
      flex: 0.48,
      overflow: 'hidden',
      backgroundColor: isDark ? 'rgba(50, 50, 50, 0.8)' : 'rgba(255, 255, 255, 1)',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    buttonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonIcon: {
      marginRight: 8,
    },
    buttonText: {
      fontWeight: '600',
      fontSize: 13,
      color: colors.accent,
    },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 16,
      marginVertical: 10,
      backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 1)',
      overflow: 'hidden',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    locationButtonIcon: {
      marginRight: 8,
    },
    locationButtonText: {
      fontWeight: '600',
      fontSize: 14,
      color: colors.accent,
    },
    claimsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      paddingHorizontal: 25,
      borderRadius: 16,
      marginTop: 5,
      marginBottom: 20,
      backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 1)',
      overflow: 'hidden',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    claimsButtonIcon: {
      marginRight: 10,
    },
    claimsButtonText: {
      fontWeight: '600',
      fontSize: 14,
      color: colors.accent,
    },
    tabContainer: {
      flexDirection: 'row',
      marginBottom: 15,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(45, 45, 45, 0.6)' : 'rgba(255, 255, 255, 1)',
      padding: 5,
      marginHorizontal: 20,
      overflow: 'hidden',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
    },
    activeTab: {
      backgroundColor: colors.accent,
    },
    tabText: {
      fontSize: 15,
      fontWeight: '500',
    },
    activeTabText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    contentContainer: {
      paddingHorizontal: 20,
    },
    gridContainer: {
      marginTop: 5,
    },
    postsGrid: {
      width: '100%',
    },
    postItem: {
      width: (width - 50) / 3,
      aspectRatio: 1,
      margin: 5,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: isDark ? '#333' : '#f0f0f0',
    },
    postImage: {
      width: '100%',
      height: '100%',
    },
    petItem: {
      width: (width - 60) / 2,
      margin: 12,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: isDark ? 'rgba(50, 50, 50, 0.5)' : 'rgba(255, 255, 255, 1)',
      padding: 8,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    petImageContainer: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 8,
    },
    petImage: {
      width: '100%',
      height: '100%',
    },
    petName: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      paddingVertical: 5,
    },
    petSpeciesIcon: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 30,
      marginTop: 20,
      backgroundColor: isDark ? 'rgba(45, 45, 45, 0.6)' : 'rgba(255, 255, 255, 1)',
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    emptyIcon: {
      marginBottom: 15,
      opacity: 0.7,
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 22,
      opacity: 0.8,
    },
    createButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 16,
      overflow: 'hidden',
    },
    createButtonGradient: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    createButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 14,
      marginLeft: 8,
    },
    addPetButton: {
      position: 'absolute',
      bottom: 25,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
    },
    addPetButtonInner: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.8)',
    },
  });

  const renderPostItem = ({ item, index }: { item: Post, index: number }) => (
    <TouchableOpacity 
      style={[
        styles.postItem,
        { 
          marginLeft: index % 3 === 0 ? 0 : 5,
        }
      ]}
      onPress={() => router.push(`/post/${item.id}`)}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: item.image }} 
        style={styles.postImage} 
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  const renderPetItem = ({ item, index }: { item: any }) => (
    <TouchableOpacity 
      style={[
        styles.petItem,
        { marginLeft: index % 2 === 0 ? 0 : 10 }
      ]}
      onPress={() => router.push(`/pet/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.petImageContainer}>
        <Image 
          source={
            item.primaryImage 
              ? { uri: getImageUrl(item.primaryImage) } 
              : require('@/assets/images/default-pet.png')
          } 
          style={styles.petImage} 
          resizeMode="cover"
        />
        <View style={styles.petSpeciesIcon}>
          <Ionicons 
            name={item.species === 'DOG' ? 'paw' : 'logo-octocat'} 
            size={14} 
            color={colors.accent} 
          />
        </View>
      </View>
      <Text style={[styles.petName, { color: isDark ? '#FFFFFF' : '#333333' }]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#FFFFFF' }]}>
        <Loading message="Carregando perfil..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={isDark ? '#FFFFFF' : colors.accent}
            title="Atualizando..."
            titleColor={isDark ? '#FFFFFF' : '#333333'}
          />
        }
      >
        {/* Informações de perfil */}
        <View style={styles.profileInfoContainer}>
          {/* Avatar sem animação de pulso */}
          <View style={styles.avatarContainer}>
            <Image 
              source={
                user.profileImage 
                  ? { uri: getImageUrl(user.profileImage) } 
                  : require('@/assets/images/default-avatar.png')
              } 
              style={styles.profileImage} 
              resizeMode="cover"
            />
          </View>

          {/* Nome e email */}
          <View style={styles.nameContainer}>
            <Text style={[styles.name, { color: isDark ? '#FFFFFF' : '#333333' }]}>
              {user.name}
            </Text>
            <Text style={[styles.email, { color: isDark ? '#AAAAAA' : '#666666' }]}>
              {user.email}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{posts.length}</Text>
              <Text style={[styles.statLabel, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                Posts
              </Text>
            </View>
                  
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push(`/follow/followers/${user?.id}`)}
            >
              <Text style={styles.statValue}>{followers}</Text>
              <Text style={[styles.statLabel, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                Seguidores
              </Text>
            </TouchableOpacity>
                  
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push(`/follow/following/${user?.id}`)}
            >
              <Text style={styles.statValue}>{following}</Text>
              <Text style={[styles.statLabel, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                Seguindo
              </Text>
            </TouchableOpacity>
                  
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pets.length}</Text>
              <Text style={[styles.statLabel, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                Pets
              </Text>
            </View>
          </View>

          {/* Botões de ação */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/settings/account')}
            >
              <View style={styles.buttonInner}>
                <Ionicons name="person-outline" size={18} color={colors.accent} style={styles.buttonIcon} />
                <Text style={[styles.buttonText]}>
                  Editar Perfil
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/settings')}
            >
              <View style={styles.buttonInner}>
                <Ionicons name="settings-outline" size={18} color={colors.accent} style={styles.buttonIcon} />
                <Text style={[styles.buttonText]}>
                  Configurações
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Botão para atualizar localização */}
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={() => {
              // Execute a atualização de localização diretamente
              // Refresque os dados após atualização
              setTimeout(onRefresh, 1000);
            }}
          >
            <Ionicons 
              name="location-outline" 
              size={18} 
              color={colors.accent} 
              style={styles.locationButtonIcon} 
            />
            <Text style={styles.locationButtonText}>
              Atualizar Localização
            </Text>
            <LocationUpdateButton 
              showText={false}
              buttonSize="small"
              onSuccess={onRefresh}
              style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0 }}
            />
          </TouchableOpacity>

          {/* Botão para acessar Claims */}
          <TouchableOpacity 
            style={styles.claimsButton}
            onPress={() => router.push('/claims')}
          >
            <Ionicons 
              name="alert-circle-outline" 
              size={20} 
              color={colors.accent} 
              style={styles.claimsButtonIcon} 
            />
            <Text style={styles.claimsButtonText}>
              Minhas Reivindicações
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Tabs de navegação */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              selectedTab === 'posts' && styles.activeTab,
            ]}
            onPress={() => setSelectedTab('posts')}
          >
            <Text 
              style={[
                styles.tabText, 
                selectedTab === 'posts' && styles.activeTabText,
                { color: selectedTab === 'posts' ? '#FFFFFF' : (isDark ? '#DDDDDD' : '#666666') }
              ]}
            >
              Meus Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.tab, 
              selectedTab === 'pets' && styles.activeTab,
            ]}
            onPress={() => setSelectedTab('pets')}
          >
            <Text 
              style={[
                styles.tabText, 
                selectedTab === 'pets' && styles.activeTabText,
                { color: selectedTab === 'pets' ? '#FFFFFF' : (isDark ? '#DDDDDD' : '#666666') }
              ]}
            >
              Meus Pets
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Conteúdo baseado na tab selecionada */}
        <View style={styles.contentContainer}>
          {loading ? (
            <Loading message="Carregando conteúdo..." />
          ) : (
            <>
              {selectedTab === 'posts' ? (
                posts.length > 0 ? (
                  <FlatList
                    key="posts"
                    data={posts}
                    renderItem={renderPostItem}
                    keyExtractor={item => item.id}
                    numColumns={3}
                    scrollEnabled={false}
                    style={styles.postsGrid}
                    contentContainerStyle={styles.gridContainer}
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons 
                      name="images-outline" 
                      size={60} 
                      color={isDark ? colors.accent + '60' : colors.accent + '80'} 
                      style={styles.emptyIcon}
                    />
                    <Text style={[styles.emptyText, { color: isDark ? '#BBBBBB' : '#666666' }]}>
                      Você ainda não compartilhou nenhum post com a comunidade
                    </Text>
                    <TouchableOpacity 
                      style={styles.createButton}
                      onPress={() => router.push('/camera')}
                    >
                      <LinearGradient
                        colors={[colors.accent, '#FF8A43']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.createButtonGradient}
                      >
                        <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.createButtonText}>Criar Post</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                pets.length > 0 ? (
                  <FlatList
                    key="pets"
                    data={pets}
                    renderItem={renderPetItem}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    scrollEnabled={false}
                    contentContainerStyle={styles.gridContainer}
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons 
                      name="paw-outline" 
                      size={60} 
                      color={isDark ? colors.accent + '60' : colors.accent + '80'} 
                      style={styles.emptyIcon}
                    />
                    <Text style={[styles.emptyText, { color: isDark ? '#BBBBBB' : '#666666' }]}>
                      Você ainda não cadastrou nenhum pet
                    </Text>
                    <TouchableOpacity 
                      style={styles.createButton}
                      onPress={() => router.push('/pet/create')}
                    >
                      <LinearGradient
                        colors={[colors.accent, '#FF8A43']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.createButtonGradient}
                      >
                        <Ionicons name="add-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.createButtonText}>Cadastrar Pet</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Botão flutuante simplificado */}
      <TouchableOpacity
        style={styles.addPetButton}
        onPress={() => router.push('/pet/create')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}