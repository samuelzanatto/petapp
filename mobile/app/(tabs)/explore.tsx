import React, { useRef, useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Image, TouchableOpacity, TouchableWithoutFeedback, RefreshControl, ActivityIndicator, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommentsBottomSheet, { CommentsBottomSheetRef } from '@/components/CommentsBottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/auth';
import { router } from 'expo-router';
import { usePosts } from '@/hooks/usePosts';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import ThemedButton from '@/components/ThemedButton';
import { Loading } from '@/components/Loading';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '@/constants/Fonts';

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
  commentsCount?: number;
};

export default function ExploreScreen() {
  const { user, signIn } = useAuth();
  const { 
    posts, 
    loading, 
    error, 
    refreshing, 
    refreshPosts, 
    likePost,
    commentOnPost
  } = usePosts();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const commentsSheetRef = useRef<CommentsBottomSheetRef>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  // Referência para animação de curtida por post
  const likeAnimations = useRef<{[key: string]: Animated.Value}>({}).current;
  // Referência para tempos para detectar duplo clique e animação de coração
  const doubleTapRefs = useRef<{[key: string]: NodeJS.Timeout | null}>({}).current;
  const heartAnimations = useRef<{[key: string]: {opacity: Animated.Value, scale: Animated.Value}}>({}).current;
  // Estado para controlar quando uma curtida está sendo processada
  const [processingLikes, setProcessingLikes] = useState<{[key: string]: boolean}>({});

  const handleOpenComments = (postId: string) => {
    setActivePostId(postId);
    commentsSheetRef.current?.open();
  };

  const handleAddComment = async (content: string) => {
    if (!activePostId) return false;
    
    try {
      // Usar a função do hook que já tem acesso ao setPosts internamente
      await commentOnPost(activePostId, content);
      return true;
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      return false;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorTitle: {
      fontSize: 20,
      fontFamily: FontFamily.bold,
      marginTop: 15,
      marginBottom: 5,
    },
    errorMessage: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 20,
      fontFamily: FontFamily.regular,
    },
    actionButton: {
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 10,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 0,
      paddingTop: Platform.OS === 'ios' ? 10 : 15,
    },
    headerTitle: {
      fontWeight: 'bold',
      fontSize: 24,
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 10,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 8,
      shadowOpacity: isDark ? 0.6 : 0.4,
      elevation: 5,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.6)',
    },
    postContainer: {
      marginBottom: 20,
      borderRadius: 16,
      padding: 0,
      overflow: 'hidden',
      backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 1)',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 15,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      marginRight: 12,
      borderWidth: 1.5,
      borderColor: colors.accent,
      backgroundColor: isDark ? '#333' : '#f0f0f0',
    },
    userName: {
      fontFamily: FontFamily.bold,
      fontSize: 15,
    },
    petName: {
      fontSize: 13,
      marginTop: 2,
      fontFamily: FontFamily.regular,
    },
    imageContainer: {
      width: '100%',
      height: 300,
      overflow: 'hidden',
      paddingHorizontal: 15, 
      paddingVertical: 10,
    },
    postImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
      borderRadius: 16,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    postActions: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      paddingVertical: -10,
    },
    likeButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
    },
    commentIcon: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
      borderRadius: 20,
    },
    postFooter: {
      paddingHorizontal: 15,
      paddingBottom: 15,
      paddingTop: 0,
    },
    likesCount: {
      fontFamily: FontFamily.bold,
      marginBottom: 5,
    },
    commentsCount: {
      fontSize: 14,
      marginBottom: 5,
      fontFamily: FontFamily.medium,
    },
    caption: {
      marginBottom: 5,
      lineHeight: 20,
      fontFamily: FontFamily.regular,
    },
    timestamp: {
      fontSize: 12,
      marginTop: 5,
      fontFamily: FontFamily.regular,
      opacity: 0.8,
    },
  });

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Loading message="Carregando posts..." />
      </SafeAreaView>
    );
  }

  // Renderiza tela de erro de autenticação
  if (error && error.includes('401')) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed" size={50} color={colors.error} />
        <ThemedText style={styles.errorTitle}>Acesso não autorizado</ThemedText>
        <ThemedText style={styles.errorMessage}>Você precisa fazer login para ver os posts</ThemedText>
        <ThemedButton 
          title="Fazer login"
          onPress={() => router.push('/auth/login')}
          style={styles.actionButton}
        />
      </SafeAreaView>
    );
  }

  // Renderiza mensagem genérica de erro
  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={50} color={colors.error} />
        <ThemedText style={styles.errorTitle}>Ops! Algo deu errado</ThemedText>
        <ThemedText style={styles.errorMessage}>{error}</ThemedText>
        <ThemedButton 
          title="Tentar novamente"
          onPress={refreshPosts}
          style={styles.actionButton}
        />
      </SafeAreaView>
    );
  }

  const handleLike = async (postId: string) => {
    try {
      // Se já estiver processando uma curtida para este post, ignore
      if (processingLikes[postId]) return;
      
      // Marcar que estamos processando uma curtida para este post
      setProcessingLikes(prev => ({ ...prev, [postId]: true }));
      
      // Garantir que temos uma instância de Animated.Value para este post
      if (!likeAnimations[postId]) {
        likeAnimations[postId] = new Animated.Value(1);
      }
      
      // Verificar se o post já está curtido
      const post = posts.find(p => p.id === postId);
      const isLiked = post?.hasLiked || false;
      
      // Iniciar animação sempre, independente do estado de curtida
      Animated.sequence([
        Animated.timing(likeAnimations[postId], {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true
        }),
        Animated.timing(likeAnimations[postId], {
          toValue: 1,
          duration: 150,
          useNativeDriver: true
        })
      ]).start();
      
      // Chamar a função likePost do hook apenas se o post não estiver curtido
      if (!isLiked) {
        await likePost(postId);
      }
    } catch (error) {
      console.error('Erro ao curtir post:', error);
    } finally {
      // Limpar o estado de processamento
      setProcessingLikes(prev => ({ ...prev, [postId]: false }));
    }
  };

  const showHeartAnimation = (postId: string) => {
    // Criar objetos de animação para este post se ainda não existirem
    if (!heartAnimations[postId]) {
      heartAnimations[postId] = {
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0)
      };
    }

    // Reiniciar valores iniciais
    heartAnimations[postId].opacity.setValue(1);
    heartAnimations[postId].scale.setValue(0);
    
    // Sequência da animação do coração grande
    Animated.sequence([
      // Fazer o coração crescer
      Animated.timing(heartAnimations[postId].scale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      // Manter visível por um momento
      Animated.delay(300),
      // Desaparecer suavemente
      Animated.timing(heartAnimations[postId].opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
  };

  const handleDoubleTap = (postId: string) => {
    if (doubleTapRefs[postId]) {
      // É um duplo clique
      clearTimeout(doubleTapRefs[postId]);
      doubleTapRefs[postId] = null;
      
      // Mostrar animação do coração sempre
      showHeartAnimation(postId);
      
      // Obter o post atual
      const post = posts.find(p => p.id === postId);
      
      // Se não estiver curtido, chamar a função de curtir
      if (!post?.hasLiked) {
        handleLike(postId);
      } else {
        // Se já estiver curtido, apenas animar o coração na barra de ações
        // sem alterar o estado ou enviar requisição
        if (!likeAnimations[postId]) {
          likeAnimations[postId] = new Animated.Value(1);
        }
        
        Animated.sequence([
          Animated.timing(likeAnimations[postId], {
            toValue: 1.3,
            duration: 150,
            useNativeDriver: true
          }),
          Animated.timing(likeAnimations[postId], {
            toValue: 1,
            duration: 150,
            useNativeDriver: true
          })
        ]).start();
      }
    } else {
      // Configura o temporizador para o próximo clique
      doubleTapRefs[postId] = setTimeout(() => {
        doubleTapRefs[postId] = null;
      }, 300);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <ThemedCard style={styles.postContainer}>
      <View style={styles.postHeader}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => {
            if (item.user.id === user?.id) {
              router.navigate('/(tabs)/profile');
            } else {
              router.push(`/profile/${item.user.id}`);
            }
          }}
        >
          <Image
            source={
              item.user.profileImage
                ? { uri: item.user.profileImage }
                : require('../../assets/images/default-avatar.png')
            }
            style={styles.avatar}
          />
          <View>
            <ThemedText style={styles.userName}>{item.user.name}</ThemedText>
            {item.pet && (
              <ThemedText style={[styles.petName, { color: colors.textTertiary }]}>
                {item.pet.name} • {item.pet.species === 'DOG' ? '🐶' : '🐱'}
              </ThemedText>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.imageContainer}>
        <TouchableWithoutFeedback onPress={() => handleDoubleTap(item.id)}>
          <View style={{ position: 'relative' }}>
            <Image 
              source={{ uri: item.image }} 
              style={styles.postImage}
              defaultSource={require('../../assets/images/placeholder.png')}
              onError={(e) => console.error(`Erro ao carregar imagem ${item.image}:`, e.nativeEvent.error)}
            />
            
            {/* Animação do coração no centro da imagem */}
            {heartAnimations[item.id] && (
              <Animated.View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: heartAnimations[item.id].opacity,
              }}>
                <Animated.View style={{
                  transform: [{ scale: heartAnimations[item.id].scale }]
                }}>
                  <Ionicons name="heart" size={80} color="#FF6B6B" />
                </Animated.View>
              </Animated.View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </View>

      <View style={styles.postActions}>
        <TouchableOpacity 
          onPress={() => handleLike(item.id)} 
          style={styles.likeButton}
          activeOpacity={0.7}
        >
          <Animated.View style={{ 
            transform: [{ scale: likeAnimations[item.id] || new Animated.Value(1) }] 
          }}>
            <Ionicons
              name={item.hasLiked ? 'heart' : 'heart-outline'}
              size={26}
              color={item.hasLiked ? colors.error : colors.text}
            />
          </Animated.View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.commentIcon}
          onPress={() => handleOpenComments(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.postFooter}>
        <ThemedText style={styles.likesCount}>{item.likesCount} curtidas</ThemedText>
        
        {item.commentsCount && item.commentsCount > 0 && (
          <TouchableOpacity onPress={() => handleOpenComments(item.id)}>
            <ThemedText style={[styles.commentsCount, { color: colors.textTertiary }]}>
              Ver {item.commentsCount} {item.commentsCount === 1 ? 'comentário' : 'comentários'}
            </ThemedText>
          </TouchableOpacity>
        )}

        {item.caption && (
          <ThemedText style={styles.caption}>
            <ThemedText style={styles.userName}>{item.user.name}</ThemedText> {item.caption}
          </ThemedText>
        )}
        <ThemedText style={[styles.timestamp, { color: colors.textTertiary }]}>
          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
        </ThemedText>
      </View>
    </ThemedCard>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedText type="title" style={styles.headerTitle}>Explorar</ThemedText>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={() => router.push('/chat')}
            style={[styles.headerButton, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/camera')}
            style={[styles.headerButton, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="camera-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={refreshPosts} 
            tintColor={isDark ? '#FFFFFF' : colors.accent}
            colors={[colors.accent]}
            title="Atualizando..."
            titleColor={isDark ? '#FFFFFF' : '#333333'}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 100, paddingTop: 10 }}
        style={{ backgroundColor: isDark ? '#121212' : '#F8F8F8' }}
      />

      <CommentsBottomSheet
        ref={commentsSheetRef}
        postId={activePostId || ''}
        commentsCount={posts.find(p => p.id === activePostId)?.commentsCount || 0}
        currentUser={user}
        postOwnerId={posts.find(p => p.id === activePostId)?.user.id}
        onAddComment={handleAddComment}
        onCommentAdded={() => {
          console.log('Comentário adicionado com sucesso!');
        }}
      />
    </SafeAreaView>
  );
}