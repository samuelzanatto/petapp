import React, { forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import { 
  View, StyleSheet, Modal, TouchableOpacity, 
  SafeAreaView, FlatList, Image, TextInput, 
  ActivityIndicator, Keyboard, Platform,
  KeyboardAvoidingView, Animated,
  Easing,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/ThemedText';
import { getImageUrl } from '@/utils/imageUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { API_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export type Comment = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    profileImage: string | null;
  };
};

export interface CommentsBottomSheetRef {
  open: () => void;
  close: () => void;
}

interface CommentsBottomSheetProps {
  postId: string;
  commentsCount: number;
  currentUser: {
    id: string;
    name?: string;
    profileImage: string | null;
  } | null;
  postOwnerId?: string; // Id do dono do post
  onAddComment: (content: string) => Promise<boolean>;
  onCommentAdded?: () => void;
  onClose?: () => void;
}

const CommentsBottomSheet = forwardRef<CommentsBottomSheetRef, CommentsBottomSheetProps>(
  (props, ref) => {
    const { postId, commentsCount, currentUser, postOwnerId, onAddComment, onCommentAdded, onClose } = props;
    const { colors, isDark } = useTheme();
    const [visible, setVisible] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [fetchInitiated, setFetchInitiated] = useState(false);
    
    // Valor de animação para o backdrop
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    
    const inputRef = useRef<TextInput>(null);
    // Referência para o timeout de segurança para evitar loading infinito
    const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Fornecer métodos para o componente pai
    useImperativeHandle(ref, () => ({
      open: () => {
        console.log('Abrindo modal de comentários');
        
        // Resetar estados ao abrir
        setLoading(true);
        setFetchError(null);
        setFetchInitiated(false);
        
        // Configurar valores iniciais de animação
        backdropOpacity.setValue(0);
        slideAnim.setValue(SCREEN_HEIGHT);
        
        // Abrir o modal
        setVisible(true);
        
        // Definir um timeout de segurança para garantir que loading sempre termine
        if (safetyTimerRef.current) {
          clearTimeout(safetyTimerRef.current);
        }
        
        safetyTimerRef.current = setTimeout(() => {
          if (loading) {
            console.log('⚠️ Safety timeout acionado - forçando finalização de loading');
            setLoading(false);
            setFetchError('Tempo limite excedido ao carregar comentários. Verifique sua conexão.');
          }
        }, 8000); // 8 segundos de timeout
      },
      close: () => {
        console.log('Fechando modal de comentários');
        closeModal();
      }
    }));
    
    // Iniciar animação quando o modal estiver visível
    useEffect(() => {
      if (visible) {
        console.log('Modal visível, iniciando animações');
        // Iniciar animação
        Animated.parallel([
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic)
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.bezier(0.16, 1, 0.3, 1)
          })
        ]).start();
        
        // Iniciar carregamento quando o modal estiver visível
        if (!fetchInitiated && postId) {
          setFetchInitiated(true);
          console.log('Iniciando fetch de comentários após modal visível');
          fetchComments();
        }
      }
    }, [visible]);
    
    // Efeito para limpar estado quando o modal fecha
    useEffect(() => {
      if (!visible) {
        // Limpar estados quando o modal é fechado completamente
        setFetchError(null);
        setComments([]);
        
        // Limpar timeout de segurança
        if (safetyTimerRef.current) {
          clearTimeout(safetyTimerRef.current);
          safetyTimerRef.current = null;
        }
      }
    }, [visible]);
    
    // Efeito para garantir que o carregamento inicial aconteça quando o postId mudar
    useEffect(() => {
      if (visible && postId && !fetchInitiated) {
        setFetchInitiated(true);
        console.log('postId mudou, recarregando comentários');
        fetchComments();
      }
    }, [postId, visible]);
    
    // Função para fechar o modal com animação
    const closeModal = () => {
      Keyboard.dismiss();
      
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease)
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.bezier(0.5, 0, 0.75, 0)
        })
      ]).start(() => {
        setVisible(false);
        if (onClose) onClose();
      });
      
      // Limpar timeout de segurança
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };
    
    // Buscar comentários da API
    const fetchComments = async () => {
      if (!postId) {
        console.error('fetchComments chamado sem postId');
        setLoading(false);
        return;
      }

      console.log(`Buscando comentários para post ${postId}`);
      
      try {
        setLoading(true);
        setFetchError(null);
        
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          throw new Error('Token não encontrado');
        }
        
        // Imprimir os detalhes da requisição para debug
        console.log(`📡 Fazendo requisição GET para ${API_URL}/posts/${postId}/comments`);
        
        const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log(`🔄 Status da resposta: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`Falha ao carregar comentários: ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ Recebidos ${data?.length || 0} comentários`);
        
        // Formatar URLs de imagens
        const formattedComments = Array.isArray(data) ? data.map((comment: any) => ({
          ...comment,
          user: {
            ...comment.user,
            profileImage: getImageUrl(comment.user.profileImage)
          }
        })) : [];

        setComments(formattedComments);
      } catch (error: any) {
        console.error('❌ Erro ao carregar comentários:', error);
        setFetchError(error.message || 'Falha ao carregar comentários');
      } finally {
        // Limpar o timeout de segurança, pois já finalizamos
        if (safetyTimerRef.current) {
          clearTimeout(safetyTimerRef.current);
          safetyTimerRef.current = null;
        }
        
        // Garantir que o loading será removido com um pequeno delay
        // Isso evita problemas de timing com a animação
        setTimeout(() => {
          console.log('🏁 Finalizando carregamento de comentários');
          setLoading(false);
        }, 300);
      }
    };

    // Enviar novo comentário
    const handleSendComment = async () => {
      if (!newComment.trim() || !currentUser) return;

      try {
        setSubmitting(true);

        const success = await onAddComment(newComment);

        if (success) {
          // Adicionar o novo comentário localmente
          const newCommentObj: Comment = {
            id: `temp-${Date.now()}`,
            content: newComment,
            createdAt: new Date().toISOString(),
            user: {
              id: currentUser.id,
              name: currentUser.name || 'Você',
              profileImage: currentUser.profileImage
            }
          };

          setComments([newCommentObj, ...comments]);
          setNewComment('');
          onCommentAdded?.();
        }
      } catch (error) {
        console.error('Erro ao enviar comentário:', error);
      } finally {
        setSubmitting(false);
      }
    };

    // Formatar data relativa
    const formatRelativeTime = (dateString: string) => {
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

    // Tentar carregar comentários novamente
    const handleRetry = () => {
      setFetchInitiated(true);
      fetchComments();
    };    // Excluir comentário
    const handleDeleteComment = async (commentId: string) => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${API_URL}/comments/${commentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          // Remover comentário da lista local
          setComments(comments.filter(comment => comment.id !== commentId));
        } else {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao excluir comentário');
        }
      } catch (error: any) {
        console.error('Erro ao excluir comentário:', error);
        Alert.alert('Erro', error.message || 'Não foi possível excluir o comentário');
      }
    };

    // Confirmar exclusão de comentário
    const confirmDeleteComment = (commentId: string) => {
      Alert.alert(
        'Excluir comentário',
        'Tem certeza que deseja excluir este comentário?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Excluir', 
            style: 'destructive', 
            onPress: () => handleDeleteComment(commentId)
          }
        ]
      );
    };    // Verificar se o usuário pode excluir o comentário (é o autor ou dono do post)
    const canDeleteComment = (comment: Comment): boolean => {
      if (!currentUser) return false;
      
      // Usuário pode excluir seus próprios comentários
      if (comment.user.id === currentUser.id) return true;
      
      // Dono do post pode excluir qualquer comentário no seu post
      const { postOwnerId } = props;
      if (postOwnerId && currentUser.id === postOwnerId) return true;
      
      return false;
    };

    // Renderizar item de comentário
    const renderCommentItem = ({ item }: { item: Comment }) => (
      <TouchableOpacity
        activeOpacity={0.9}
        delayLongPress={500}
        onLongPress={() => {
          if (canDeleteComment(item)) {
            confirmDeleteComment(item.id);
          }
        }}
      >
        <View style={[styles.commentItem, { borderBottomColor: colors.border }]}>
          <Image
            source={
              item.user.profileImage
                ? { uri: item.user.profileImage }
                : require('@/assets/images/default-avatar.png')
            }
            style={styles.commentAvatar}
          />
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <ThemedText style={styles.commentUserName}>{item.user.name}</ThemedText>
              <ThemedText style={[styles.commentTime, { color: colors.textTertiary }]}>
                {formatRelativeTime(item.createdAt)}
              </ThemedText>
            </View>
            <ThemedText style={styles.commentText}>{item.content}</ThemedText>
          </View>
        </View>
      </TouchableOpacity>
    );

    if (!visible) return null;
    
    return (
      <View style={StyleSheet.absoluteFill}>
        <Modal
          visible={true}
          transparent
          animationType="none"
          onRequestClose={closeModal}
        >
          <View style={styles.modalContainer}>
            <Animated.View 
              style={[
                styles.backdrop, 
                { 
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  opacity: backdropOpacity
                }
              ]}
            >
              <TouchableOpacity
                style={styles.backdropTouchable}
                activeOpacity={1}
                onPress={closeModal}
              />
            </Animated.View>
            
            <Animated.View 
              style={[
                styles.bottomSheet, 
                { 
                  backgroundColor: colors.card,
                  transform: [{ translateY: slideAnim }] 
                }
              ]}
            >
              {/* Barra de arrasto */}
              <View style={styles.headerContainer}>
                <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
                <ThemedText style={styles.commentsTitle}>
                  Comentários • {commentsCount}
                </ThemedText>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={closeModal}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Conteúdo - Use flex para manter consistência*/}
              <View style={styles.contentContainer}>
                {loading ? (
                  <View style={styles.centeredContainer}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <ThemedText style={{ marginTop: 10, color: colors.textSecondary, fontSize: 13 }}>
                      Carregando comentários...
                    </ThemedText>
                  </View>
                ) : fetchError ? (
                  <View style={styles.centeredContainer}>
                    <Ionicons name="alert-circle-outline" size={50} color={colors.error} />
                    <ThemedText style={[styles.errorText, { color: colors.error }]}>
                      Erro ao carregar comentários
                    </ThemedText>
                    <ThemedText style={[styles.errorSubtext, { color: colors.textSecondary }]}>
                      {fetchError}
                    </ThemedText>
                    <TouchableOpacity 
                      style={[styles.retryButton, { backgroundColor: colors.accent }]}
                      onPress={handleRetry}
                    >
                      <ThemedText style={styles.retryButtonText}>Tentar novamente</ThemedText>
                    </TouchableOpacity>
                  </View>
                ) : comments.length === 0 ? (
                  <View style={styles.centeredContainer}>
                    <Ionicons 
                      name="chatbubble-outline" 
                      size={50} 
                      color={colors.textTertiary} 
                    />
                    <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                      Nenhum comentário ainda.
                    </ThemedText>
                    <ThemedText style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                      Seja o primeiro a comentar!
                    </ThemedText>
                  </View>
                ) : (
                  <FlatList
                    data={comments}
                    renderItem={renderCommentItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.commentsList}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                  />
                )}
              </View>
              
              {/* Área de input - no final do bottomSheet */}
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
              >
                <View style={[styles.inputContainer, { 
                  borderTopColor: colors.border,
                  backgroundColor: isDark ? colors.card : 'white'
                }]}>
                  <Image
                    source={
                      currentUser?.profileImage
                        ? { uri: getImageUrl(currentUser.profileImage) }
                        : require('@/assets/images/default-avatar.png')
                    }
                    style={styles.inputAvatar}
                  />
                  <TextInput
                    ref={inputRef}
                    style={[styles.input, { 
                      color: colors.text,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0'
                    }]}
                    placeholder="Adicione um comentário..."
                    placeholderTextColor={colors.textTertiary}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                  />                  
                  <TouchableOpacity                    
                    style={[
                      styles.sendButton,
                      { 
                        backgroundColor: colors.accent,
                        opacity: (newComment.trim().length > 0 && !submitting) ? 1 : 0.5 
                      }
                    ]}
                    onPress={handleSendComment}
                    disabled={!newComment.trim() || submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="send" size={18} color="white" />
                    )}
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </Animated.View>
          </View>
        </Modal>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTouchable: {
    flex: 1,
  },
  bottomSheet: {
    height: '85%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  headerContainer: {
    paddingVertical: 28,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    minHeight: 60,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    top: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  errorSubtext: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  commentsList: {
    paddingBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 0,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
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
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 0,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  }
});

export default CommentsBottomSheet;