import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { getImageUrl } from '@/utils/imageUtils';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ChatRoom = {
  id: string;
  lastMessage: {
    content: string;
    createdAt: string;
    sender: {
      id: string;
      name: string;
    }
  } | null;
  otherUser: {
    id: string;
    name: string;
    profileImage: string | null;
  };
  updatedAt: string;
  unreadCount?: number;
};

export default function ChatListScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChatRooms();
  }, []);

  const fetchChatRooms = async () => {
    try {
      setError(null);
      if (!refreshing) setLoading(true);
      
      const data = await api.get('/chat/rooms');
      
      // Verificar se a resposta é um array
      if (!Array.isArray(data)) {
        throw new Error('Formato de resposta inválido');
      }
      
      // Formatar dados de cada sala de chat
      const formattedRooms = data.map((room: any) => ({
        ...room,
        otherUser: {
          ...room.otherUser,
          profileImage: getImageUrl(room.otherUser.profileImage)
        }
      }));
      
      // Ordenar por data da última mensagem (mais recente primeiro)
      formattedRooms.sort((a, b) => {
        const dateA = a.lastMessage?.createdAt || a.updatedAt;
        const dateB = b.lastMessage?.createdAt || b.updatedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      
      setChatRooms(formattedRooms);
    } catch (error: any) {
      console.error('Erro ao carregar conversas:', error);
      setError(error.message || 'Não foi possível carregar suas conversas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchChatRooms();
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: ptBR });
    } else if (isYesterday(date)) {
      return 'Ontem';
    } else {
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    }
  };

  const formatPreviewText = (text: string) => {
    return text.length > 40 ? `${text.substring(0, 37)}...` : text;
  };

  const renderChatRoom = ({ item }: { item: ChatRoom }) => {
    const lastMessageTime = item.lastMessage?.createdAt || item.updatedAt;
    const messagePreview = item.lastMessage?.content || 'Nenhuma mensagem ainda';
    const isMyLastMessage = item.lastMessage?.sender?.id === user?.id;
    const previewText = isMyLastMessage ? `Você: ${messagePreview}` : messagePreview;
    
    return (
      <TouchableOpacity
        onPress={() => router.push(`/chat/${item.id}`)}
        activeOpacity={0.7}
      >
        <ThemedCard style={styles.chatRoomCard}>
          <Image 
            source={
              item.otherUser.profileImage 
                ? { uri: item.otherUser.profileImage } 
                : require('@/assets/images/default-avatar.png')
            } 
            style={styles.userAvatar} 
          />
          
          <View style={styles.chatInfo}>
            <View style={styles.chatHeader}>
              <ThemedText style={styles.userName}>{item.otherUser.name}</ThemedText>
              <ThemedText style={[styles.messageTime, { color: colors.textTertiary }]}>
                {formatMessageTime(lastMessageTime)}
              </ThemedText>
            </View>
            
            <View style={styles.messagePreviewContainer}>
              <ThemedText 
                style={[
                  styles.messagePreview, 
                  { color: item.unreadCount ? colors.text : colors.textTertiary }
                ]}
                numberOfLines={1}
              >
                {formatPreviewText(previewText)}
              </ThemedText>
              
              {item.unreadCount ? (
                <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
                  <ThemedText style={styles.unreadCount}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </ThemedCard>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={60} color={colors.textTertiary} />
        <ThemedText style={styles.emptyTitle}>Nenhuma conversa</ThemedText>
        <ThemedText style={[styles.emptyText, { color: colors.textTertiary }]}>
          Suas conversas com tutores de pets aparecerão aqui.
        </ThemedText>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={styles.loadingText}>Carregando conversas...</ThemedText>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
        <ThemedText style={styles.errorTitle}>Não foi possível carregar</ThemedText>
        <ThemedText style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {error}
        </ThemedText>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: colors.accent }]}
          onPress={fetchChatRooms}
        >
          <ThemedText style={styles.retryButtonText}>Tentar novamente</ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={chatRooms}
        renderItem={renderChatRoom}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          chatRooms.length === 0 && styles.emptyCenterContent
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCenterContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 15,
    paddingBottom: 80,
    marginTop: -20,
  },
  chatRoomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
    borderRadius: 16,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  messageTime: {
    fontSize: 12,
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagePreview: {
    fontSize: 14,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    // Efeito glow/neon
    shadowColor: '#ED5014',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.8,
    elevation: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});