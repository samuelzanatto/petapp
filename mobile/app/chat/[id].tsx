import React, { useEffect, useState, useRef } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { api } from '@/services/api';
import { getSocket, subscribeToChat, unsubscribeFromChat, sendChatMessage, initializeSocket, sendTypingStatus } from '@/services/socket';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { getImageUrl } from '@/utils/imageUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ThemedText } from '@/components/ThemedText';

type Message = {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    profileImage: string | null;
  };
};

type ChatRoom = {
  id: string;
  otherUser: {
    id: string;
    name: string;
    profileImage: string | null;
  };
  messages: Message[];
};

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [typingVisible, setTypingVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const dot1Opacity = useRef(new Animated.Value(0.4)).current;
  const dot2Opacity = useRef(new Animated.Value(0.4)).current;
  const dot3Opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (otherUserTyping) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot1Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot1Opacity, {
            toValue: 0.4,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 0.4,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 0.4,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    return () => {
      // Parar animações quando o componente desmontar
      dot1Opacity.stopAnimation();
      dot2Opacity.stopAnimation();
      dot3Opacity.stopAnimation();
    };
  }, [otherUserTyping]);

  useEffect(() => {
    if (otherUserTyping) {
      // Tornar o componente visível imediatamente
      setTypingVisible(true);
      
      // Animar a entrada
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Animar a saída
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Remover o componente apenas quando a animação terminar
        setTypingVisible(false);
      });
    }
  }, [otherUserTyping]);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Se as mensagens forem carregadas, garantir que a lista está rolando para o final
    if (messages.length > 0 && !loading) {
      const timeout = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 300);
      
      return () => clearTimeout(timeout);
    }
  }, [messages, loading]);
  
  useEffect(() => {
    // Verificar status do socket ao entrar na tela
    const socket = getSocket();
    console.log('Status do socket ao entrar na tela de chat:', 
      socket ? (socket.connected ? 'Conectado' : 'Desconectado') : 'Não inicializado');
    
    // Se o socket não estiver conectado, tente inicializar
    if (!socket || !socket.connected) {
      console.log('Tentando inicializar socket na tela de chat');
      initializeSocket().then(result => {
        console.log('Resultado da inicialização do socket:', result ? 'Sucesso' : 'Falha');
      });
    }
  }, []);
  
  useEffect(() => {
    if (!id) return;
    
    // Carregar mensagens iniciais
    fetchChatRoom();
    
    // Configurar conexão WebSocket
    const socket = getSocket();
    console.log('Configurando socket para sala:', id);
    
    if (socket) {
      // Inscrever-se no canal de chat
      subscribeToChat(id as string);
      console.log('Inscrito na sala de chat:', id);
      
      // Adicionar listener para AMBOS os eventos
      socket.on('chat-message', (newMessage: Message) => {
        console.log('✅ Mensagem recebida via chat-message:', newMessage);
        processNewMessage(newMessage);
      });
      
      socket.on('new-chat-message', (newMessage: Message) => {
        console.log('✅ Mensagem recebida via new-chat-message:', newMessage);
        processNewMessage(newMessage);
      });

      socket.on('typing-status', (data: { userId: string, isTyping: boolean }) => {
        if (data.userId !== user?.id) {
          setOtherUserTyping(data.isTyping);
        }
      });
    }
    
    return () => {
      if (socket) {
        unsubscribeFromChat(id as string);
        socket.off('chat-message');
        socket.off('new-chat-message');
        socket.off('typing-status');
      }

      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [id]);

  const processNewMessage = (newMessage: Message) => {
    // Verificar se a mensagem já existe na lista para evitar duplicação
    const messageExists = messages.some(msg => msg.id === newMessage.id);
    
    if (messageExists) {
      console.log('Mensagem já existe na lista, ignorando duplicação:', newMessage.id);
      return;
    }
    
    // Formatar a URL da imagem do perfil do remetente
    const formattedMessage = {
      ...newMessage,
      sender: {
        ...newMessage.sender,
        profileImage: getImageUrl(newMessage.sender.profileImage)
      }
    };
    
    console.log('Adicionando nova mensagem à lista:', formattedMessage);
    
    // Adicionar mensagem à lista - usando callback para garantir a referência mais recente
    setMessages(prevMessages => [...prevMessages, formattedMessage]);
    
    // Rolar para a nova mensagem
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };
  
  const fetchChatRoom = async () => {
    try {
      setLoading(true);
      console.log(`Buscando sala de chat: ${id}`);
      
      const data = await api.get(`/chat/rooms/${id}`);
      
      // Formatar URLs das imagens
      const formattedRoom = {
        ...data,
        otherUser: {
          ...data.otherUser,
          profileImage: getImageUrl(data.otherUser.profileImage)
        }
      };
      
      setChatRoom(formattedRoom);
      
      // Formatar mensagens
      const formattedMessages = data.messages.map((msg: Message) => ({
        ...msg,
        sender: {
          ...msg.sender,
          profileImage: getImageUrl(msg.sender.profileImage)
        }
      }));
      
      setMessages(formattedMessages);
      
      // Garantir que a lista role até o final após o carregamento
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      }, 500);
    } catch (error: any) {
      console.error('Erro ao buscar sala de chat:', error);
      
      // Verificar se o erro está relacionado à reivindicação aprovada
      if (error.response && error.response.status === 403 && error.response.data?.message?.includes('reivindicação aprovada')) {
        setError('Você só pode acessar este chat se existir uma reivindicação aprovada entre vocês');
        // Voltar para a lista de chats após um tempo
        setTimeout(() => {
          router.back();
        }, 3000);
      } else {
        setError(error.message || 'Não foi possível carregar o chat');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id) return;
    
    try {
      setSending(true);

      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }

      sendTypingStatus(id as string, false);
      
      // Salvar uma cópia da mensagem
      const messageContent = newMessage.trim();
      
      // Limpar campo de texto imediatamente
      setNewMessage('');
      
      // Verificar se o socket está conectado
      const socket = getSocket();
      const socketConnected = socket && socket.connected;
      
      // Enviar mensagem via socket ou API REST
      if (socketConnected) {
        // Se o socket está conectado, apenas envie via socket
        // O WebSocket retornará a mensagem, então não precisamos adicionar manualmente
        sendChatMessage(id as string, messageContent);
        console.log('Mensagem enviada apenas via WebSocket');
      } else {
        // Se não tiver WebSocket, envie via API REST e adicione manualmente
        console.log('Socket não disponível, enviando apenas via API REST');
        const response = await api.post(`/chat/rooms/${id}/messages`, {
          content: messageContent
        });
        
        // Adicionar à lista de mensagens apenas quando não há WebSocket
        const newMsg = {
          ...response,
          sender: {
            ...response.sender,
            profileImage: getImageUrl(response.sender?.profileImage)
          }
        };
        
        setMessages(prevMessages => [...prevMessages, newMsg]);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Não foi possível enviar a mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    
    // Verificar se o socket está disponível
    const socket = getSocket();
    if (!socket || !socket.connected || !id) return;
    
    // Enviar status "está digitando" quando tiver texto
    if (text.length > 0) {
      sendTypingStatus(id as string, true);
      
      // Limpar timeout anterior se existir
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Configurar novo timeout para enviar "parou de digitar" após 2 segundos de inatividade
      const timeout = setTimeout(() => {
        sendTypingStatus(id as string, false);
      }, 2000);
      
      setTypingTimeout(timeout);
    } else {
      // Se o texto estiver vazio, enviar "parou de digitar" imediatamente
      sendTypingStatus(id as string, false);
      
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    }
  };
  
  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender.id === user?.id;
    const formattedTime = format(new Date(item.createdAt), 'HH:mm', { locale: ptBR });
    
    return (
      <View 
        style={[
          styles.messageContainer, 
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
        ]}
      >
        {!isMyMessage && (
          <Image 
            source={
              item.sender.profileImage 
                ? { uri: item.sender.profileImage } 
                : require('@/assets/images/default-avatar.png')
            } 
            style={styles.messageSenderAvatar} 
          />
        )}
        
        <View 
          style={[
            styles.messageContent,
            isMyMessage 
              ? [styles.myMessageContent, { backgroundColor: colors.accent }]
              : [styles.otherMessageContent, { backgroundColor: isDark ? colors.card : '#E9EAEF' }]
          ]}
        >
          <ThemedText style={[
            styles.messageText,
            isMyMessage ? { color: '#fff' } : { color: colors.text }
          ]}>
            {item.content}
          </ThemedText>
          <ThemedText style={[
            styles.messageTime,
            isMyMessage ? { color: '#fff' } : { color: colors.textTertiary }
          ]}>
            {formattedTime}
          </ThemedText>
        </View>
      </View>
    );
  };
  
  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen 
          options={{
            title: 'Carregando...',
            headerShown: true,
            headerStyle: { backgroundColor: isDark ? colors.card : '#fff' },
            headerTitleStyle: { color: colors.text },
            headerTintColor: colors.text,
          }}
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen 
          options={{ 
            title: 'Erro', 
            headerShown: true,
            headerStyle: { backgroundColor: isDark ? colors.card : '#fff' },
            headerTitleStyle: { color: colors.text },
            headerTintColor: colors.text,
          }} 
        />
        <Ionicons name="alert-circle" size={60} color={colors.error} />
        <ThemedText style={styles.errorTitle}>Erro ao carregar</ThemedText>
        <ThemedText style={[styles.errorMessage, { color: colors.textSecondary }]}>{error}</ThemedText>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.buttonText}>Voltar</ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{
          title: chatRoom?.otherUser?.name || 'Chat',
          headerTitleStyle: { color: colors.text },
          headerTitleAlign: 'center',
          headerShown: true,
          headerStyle: { backgroundColor: isDark ? colors.card : '#fff' },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push(`/profile/${chatRoom?.otherUser?.id}`)}>
              <Image 
                source={
                  chatRoom?.otherUser?.profileImage 
                    ? { uri: chatRoom.otherUser.profileImage } 
                    : require('@/assets/images/default-avatar.png')
                } 
                style={{ width: 30, height: 30, borderRadius: 15 }} 
              />
            </TouchableOpacity>
          ),
        }}
      />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          showsVerticalScrollIndicator={false}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.messagesContainer, 
            { backgroundColor: colors.background }
          ]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={() => 
            typingVisible ? (
              <Animated.View style={{ opacity: fadeAnim }}>
                <View style={styles.typingContainer}>
                  <View style={[
                    styles.typingContent, 
                    { backgroundColor: isDark ? colors.card : '#E9EAEF' }
                  ]}>
                    <ThemedText style={[styles.typingText, { color: colors.textSecondary }]}>Digitando</ThemedText>
                    <View style={styles.typingDots}>
                      <Animated.View 
                        style={[
                          styles.typingDot, 
                          { 
                            opacity: dot1Opacity,
                            backgroundColor: isDark ? colors.textSecondary : '#666' 
                          }
                        ]} 
                      />
                      <Animated.View 
                        style={[
                          styles.typingDot, 
                          { 
                            opacity: dot2Opacity,
                            backgroundColor: isDark ? colors.textSecondary : '#666' 
                          }
                        ]} 
                      />
                      <Animated.View 
                        style={[
                          styles.typingDot, 
                          { 
                            opacity: dot3Opacity,
                            backgroundColor: isDark ? colors.textSecondary : '#666' 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
              </Animated.View>
            ) : null
          }
        />
        
        <View style={[
          styles.inputContainer, 
          { 
            backgroundColor: isDark ? colors.card : '#fff',
            borderTopColor: colors.border 
          }
        ]}>
          <TextInput
            style={[
              styles.input, 
              { 
                backgroundColor: isDark ? colors.background : '#F0F0F0',
                color: colors.text
              }
            ]}
            value={newMessage}
            onChangeText={handleTyping}
            placeholder="Digite sua mensagem..."
            placeholderTextColor={colors.textTertiary}
            multiline
          />
          <TouchableOpacity 
            onPress={handleSendMessage} 
            disabled={!newMessage.trim() || sending}
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.disabledSendButton
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: -35,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 15,
    color: '#333',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 15,
  },
  button: {
    backgroundColor: '#ED5014',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messagesContainer: {
    padding: 10,
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: 5,
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '90%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageSenderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 15,
  },
  messageContent: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '80%',
  },
  myMessageContent: {
    borderBottomRightRadius: 4,
  },
  otherMessageContent: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
    opacity: 0.7,
  },
  myMessageTime: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 0,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ED5014',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  disabledSendButton: {
    backgroundColor: '#CCCCCC',
  },
  typingContainer: {
    paddingHorizontal: 35,
    paddingVertical: 5,
    paddingBottom: 10,
    alignSelf: 'flex-start',
  },
  typingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  typingText: {
    fontSize: 14,
    marginRight: 5,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: 2,
  },
  typingDot1: {
    opacity: 0.6,
  },
  typingDot2: {
    opacity: 0.8,
  },
  typingDot3: {
    opacity: 1,
  },
});