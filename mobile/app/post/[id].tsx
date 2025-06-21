import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Dimensions,
  Share,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Animated,
  TouchableWithoutFeedback,
  GestureResponderEvent
} from 'react-native';
import CommentsBottomSheet, { CommentsBottomSheetRef } from '@/components/CommentsBottomSheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/auth';
import { usePosts } from '../../hooks/usePosts';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { API_URL } from '../../constants/Config';
import { getImageUrl } from '@/utils/imageUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/ThemedText';

// Adicionar tipo para comentários
type Comment = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    profileImage: string | null;
  };
};

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
  commentsCount: number;
  hasLiked: boolean;
};

const { width } = Dimensions.get('window');

export default function PostDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { likePost } = usePosts();
  const { colors, isDark } = useTheme();  const scrollViewRef = useRef<ScrollView>(null);
  const commentsSheetRef = useRef<CommentsBottomSheetRef>(null);
  const heartScale = useRef(new Animated.Value(1)).current;
  const doubleTapRef = useRef<NodeJS.Timeout | null>(null);
  const heartAnimationOpacity = useRef(new Animated.Value(0)).current;
  const heartAnimationScale = useRef(new Animated.Value(0)).current;
    const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const [isProcessingLike, setIsProcessingLike] = useState(false);

  const fetchPostDetails = async () => {
    try {
      setLoading(true);
      
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/posts/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }
      
      const data = await response.json();
      
      // Formatar URLs de imagens antes de atualizar o estado
      const formattedPost = {
        ...data,
        image: getImageUrl(data.image),
        user: {
          ...data.user,
          profileImage: getImageUrl(data.user.profileImage)
        },
        pet: data.pet ? {
          ...data.pet,
          primaryImage: getImageUrl(data.pet.primaryImage)
        } : null
      };
      
      setPost(formattedPost);
      setIsLiked(data.hasLiked);
      setLikesCount(data.likesCount);
      
      // Buscar comentários após carregar o post
      fetchComments();
    } catch (error: any) {
      console.error('Erro ao buscar detalhes do post:', error);
      setError('Não foi possível carregar os detalhes do post. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const startLikeAnimation = () => {
    // Animar o ícone do coração na barra de ações
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
  };

  const showHeartAnimation = () => {
    // Define a posição do coração para o centro da imagem
    heartAnimationOpacity.setValue(1);
    heartAnimationScale.setValue(0);
    
    // Sequência da animação do coração grande
    Animated.sequence([
      // Fazer o coração crescer
      Animated.timing(heartAnimationScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      // Manter visível por um momento
      Animated.delay(300),
      // Desaparecer suavemente
      Animated.timing(heartAnimationOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
  };  const handleDoubleTap = (event?: GestureResponderEvent) => {
    if (doubleTapRef.current) {
      // É um duplo clique
      clearTimeout(doubleTapRef.current);
      doubleTapRef.current = null;
      
      // Mostrar animação do coração sempre que houver duplo clique
      showHeartAnimation();
      
      // Iniciar animação de curtida independente se já curtiu ou não
      startLikeAnimation();
      
      // Alterar estado de curtida apenas se não estiver curtido
      if (!isLiked) {
        handleLikeToggle();
      }
    } else {
      // Configura o temporizador para o próximo clique
      doubleTapRef.current = setTimeout(() => {
        doubleTapRef.current = null;
      }, 300);
    }
  };

  const fetchComments = async () => {
    if (!id) return;
    
    try {
      setLoadingComments(true);
      
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/posts/${id}/comments`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }
      
      const commentsData = await response.json();
      
      // Formatar URLs de imagens dos usuários
      const formattedComments = commentsData.map((comment: any) => ({
        ...comment,
        user: {
          ...comment.user,
          profileImage: getImageUrl(comment.user.profileImage)
        }
      }));
      
      setComments(formattedComments);
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      Alert.alert('Erro', 'Não foi possível carregar os comentários. Tente novamente.');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleOpenComments = () => {
    commentsSheetRef.current?.open();
  };

  const handleAddComment = async (content: string) => {
    if (!post) return false;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        throw new Error('Erro ao adicionar comentário');
      }
      
      // Incrementar contagem de comentários
      setPost(prev => prev ? {
        ...prev,
        commentsCount: (prev.commentsCount || 0) + 1
      } : null);
      
      return true;
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchPostDetails();
  }, [id]);  const handleLikeToggle = async () => {
    if (!post) return;
    
    try {
      // Se já houver uma requisição em andamento, não faz nada
      if (isProcessingLike) return;
      
      // Se o post já está curtido, apenas mostrar a animação sem tentar descurtir
      if (isLiked) {
        startLikeAnimation();
        return;
      }
      
      // Flag para indicar que uma operação de curtida está em andamento
      setIsProcessingLike(true);
      
      // Atualizar UI imediatamente (abordagem otimista)
      setIsLiked(true); // Sempre true pois não permitimos descurtir
      setLikesCount(prev => prev + 1);
      
      // Iniciar animação de curtida
      startLikeAnimation();
      
      // Se o post já foi curtido antes no backend, não enviar nova requisição
      const wasLikedBefore = post.hasLiked;
      
      // Chamar API apenas se for a primeira curtida
      if (!wasLikedBefore) {
        await fetch(`${API_URL}/posts/${post.id}/like`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('userToken')}`
          }
        });
        
        // Atualizar o post para refletir o novo estado de curtida
        if (post) {
          post.hasLiked = true;
        }
      }
    } catch (error) {
      // Reverter mudanças em caso de erro
      console.error('Erro ao curtir post:', error);
      setIsLiked(false);
      setLikesCount(prev => Math.max(0, prev - 1));
      Alert.alert('Erro', 'Não foi possível processar sua ação. Tente novamente.');
    } finally {
      // Resetar a flag
      setIsProcessingLike(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    
    Alert.alert(
      'Excluir post',
      'Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${API_URL}/posts/${post.id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (!response.ok) {
                throw new Error('Erro ao excluir post');
              }
              
              Alert.alert('Sucesso', 'Post excluído com sucesso!');
              router.back();
            } catch (error) {
              console.error('Erro ao excluir post:', error);
              Alert.alert('Erro', 'Não foi possível excluir o post. Tente novamente.');
            }
          }
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!post) return;
    
    try {
      await Share.share({
        message: `Confira este post incrível de ${post.user.name} no PetApp!`,
        url: post.image,
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    
    return format(date, "d 'de' MMM", { locale: ptBR });
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={[styles.commentItem, { borderBottomColor: colors.border }]}>
      <Image
        source={
          item.user.profileImage
            ? { uri: item.user.profileImage }
            : require('../../assets/images/default-avatar.png')
        }
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <ThemedText style={styles.commentUserName}>{item.user.name}</ThemedText>
          <ThemedText style={[styles.commentTime, { color: colors.textTertiary }]}>
            {formatCommentDate(item.createdAt)}
          </ThemedText>
        </View>
        <ThemedText style={styles.commentText}>{item.content}</ThemedText>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={styles.loadingText}>Carregando post...</ThemedText>
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <ThemedText style={[styles.errorText, { color: colors.error }]}>
          {error || 'Post não encontrado'}
        </ThemedText>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backButtonText}>Voltar</ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isOwner = post.user.id === user?.id;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { 
        borderBottomColor: colors.border,
        backgroundColor: isDark ? colors.card : '#fff'
      }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Detalhes do Post</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          style={{ backgroundColor: colors.background }}
          ref={scrollViewRef}
        >
          <View style={[styles.userInfoContainer, { backgroundColor: isDark ? colors.card : '#fff' }]}>
            <Image 
              source={
                post.user.profileImage 
                  ? { uri: post.user.profileImage } 
                  : require('../../assets/images/default-avatar.png')
              } 
              style={styles.userAvatar} 
            />
            <View style={styles.userTextContainer}>
              <ThemedText style={styles.userName}>{post.user.name}</ThemedText>
              {post.pet && (
                <ThemedText style={[styles.petInfo, { color: colors.textTertiary }]}>
                  {post.pet.species === 'DOG' ? '🐶' : '🐱'} {post.pet.name}
                </ThemedText>
              )}
            </View>
            
            {isOwner && (
              <TouchableOpacity 
                style={styles.optionsButton}
                onPress={handleDeletePost}
              >
                <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableWithoutFeedback onPress={handleDoubleTap}>
            <View style={{ position: 'relative' }}>
              <Image 
                source={{ uri: post.image }} 
                style={[styles.postImage, { height: width }]} 
                onError={(e) => {
                  console.error('Erro ao carregar imagem:', post.image, e.nativeEvent.error);
                }}
              />
              
              {/* Animação do coração no centro da imagem */}
              <Animated.View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: heartAnimationOpacity,
              }}>
                <Animated.View style={{
                  transform: [{ scale: heartAnimationScale }]
                }}>
                  <Ionicons name="heart" size={80} color="#FF6B6B" />
                </Animated.View>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>

          <View style={[styles.actionsContainer, { backgroundColor: isDark ? colors.card : '#fff' }]}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLikeToggle}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons 
                  name={isLiked ? "heart" : "heart-outline"} 
                  size={28} 
                  color={isLiked ? "#FF6B6B" : colors.text} 
                />
              </Animated.View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={26} color={colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.contentContainer, { backgroundColor: isDark ? colors.card : '#fff' }]}>
            <ThemedText style={styles.likesText}>{likesCount} curtidas</ThemedText>

            {/* Mostrar contagem de comentários clicável */}
            {post.commentsCount > 0 && (
              <TouchableOpacity onPress={handleOpenComments}>
                <ThemedText style={[styles.commentsCount, { color: colors.textTertiary }]}>
                  Ver {post.commentsCount} {post.commentsCount === 1 ? 'comentário' : 'comentários'}
                </ThemedText>
              </TouchableOpacity>
            )}

            {post.caption && (
              <ThemedText style={styles.caption}>
                <ThemedText style={styles.captionName}>{post.user.name}</ThemedText>{' '}
                {post.caption}
              </ThemedText>
            )}

            <ThemedText style={[styles.dateText, { color: colors.textTertiary }]}>
              {formatDate(post.createdAt)}
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>      <CommentsBottomSheet
        ref={commentsSheetRef}
        postId={post.id}
        commentsCount={post.commentsCount}
        currentUser={user}
        postOwnerId={post.user.id}
        onAddComment={handleAddComment}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 20,
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  petInfo: {
    fontSize: 13,
  },
  optionsButton: {
    padding: 5,
  },
  postImage: {
    width: '100%',
    resizeMode: 'cover',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingTop: 16,
    paddingHorizontal: 15,
  },
  actionButton: {
    marginRight: 15,
  },
  contentContainer: {
    padding: 15,
  },
  likesText: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  caption: {
    lineHeight: 20,
    marginBottom: 10,
  },
  captionName: {
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    marginTop: 5,
  },
  // Estilos para a seção de comentários
  commentsSection: {
    marginTop: 10,
    paddingTop: 15,
  },
  commentsSectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  currentUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: '#FF6B6B',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  commentLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noCommentsContainer: {
    padding: 30,
    alignItems: 'center',
  },
  noCommentsText: {
    marginTop: 10,
    fontSize: 15,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUserName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentsCount: {
    fontSize: 14,
    marginBottom: 10,
  },
});