import React, { useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl, 
  Image, 
  Alert,
  Animated 
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import EmptyState from '@/components/EmptyState';
import { useTheme } from '@/contexts/theme';
import { useNotifications } from '@/hooks/useNotifications';
import { formatRelativeTime } from '@/utils/formatters';

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { 
    notifications, 
    loading, 
    error, 
    fetchNotifications, 
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications 
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  
  // Referência para o Swipeable que está aberto (para fechar ao abrir outro)
  const swipeableRef = useRef<Swipeable | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleNotificationPress = (notification: any) => {
    // Marcar como lida quando tocada
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navegar para a tela apropriada com base no tipo de notificação
    switch(notification.type) {
      case 'CHAT':
        if (notification.data?.chatRoomId) {
          router.push(`/chat/${notification.data.chatRoomId}`);
        }
        break;
      case 'LOST_PET':
        if (notification.data?.alertId) {
          router.push(`/pet/lost-details/${notification.data.alertId}`);
        }
        break;      case 'FOUND_PET':
        if (notification.data?.alertId) {
          router.push(`/pet/found-details/${notification.data.alertId}`);
        }
        break;
      case 'PET_FOUND':
        if (notification.data?.alertId) {
          router.push({
            pathname: '/pet/lost-details/[id]',
            params: { 
              id: notification.data.alertId,
              showSightings: 'true',
              highlight: notification.data.sightingId
            }
          });
        }
        break;
      case 'PET_SIGHTING':
        if (notification.data?.alertId) {
          router.push(`/pet/lost-details/${notification.data.alertId}`);
        }
        break;
      case 'LIKE':
      case 'COMMENT':
        if (notification.data?.postId) {
          router.push(`/post/${notification.data.postId}`);
        }
        break;
      case 'FOLLOW':
        if (notification.data?.userId) {
          router.push(`/profile/${notification.data.userId}`);
        }
        break;
      case 'CLAIM':
        if (notification.data?.claimId) {
          router.push(`/claims/${notification.data.claimId}`);
        }
        break;
    }
  };

  // Função para excluir uma notificação
  const handleDeleteNotification = (id: string) => {
    deleteNotification(id);
  };

  // Função para excluir todas as notificações com confirmação
  const handleDeleteAllNotifications = () => {
    Alert.alert(
      'Excluir todas as notificações',
      'Tem certeza que deseja excluir todas as notificações? Esta ação não pode ser desfeita.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteAllNotifications(),
        },
      ],
      { cancelable: true }
    );
  };
  // Obter ícone com base no tipo de notificação
  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'CHAT':
        return 'chatbubble';
      case 'LOST_PET':
        return 'paw';
      case 'FOUND_PET':
        return 'search';
      case 'PET_FOUND':
        return 'checkmark-circle';
      case 'PET_SIGHTING':
        return 'eye';
      case 'LIKE':
        return 'heart';
      case 'COMMENT':
        return 'chatbubble-ellipses';
      case 'FOLLOW':
        return 'person-add';
      case 'CLAIM':
        return 'hand-left';
      default:
        return 'notifications';
    }
  };
  // Obter cor do ícone com base no tipo de notificação
  const getIconColor = (type: string) => {
    switch(type) {
      case 'CHAT':
        return '#4B7BEC';
      case 'LOST_PET':
        return '#FC5C65';
      case 'FOUND_PET':
        return '#26DE81';
      case 'PET_FOUND':
        return '#EB3B5A';
      case 'PET_SIGHTING':
        return '#FF9500';
      case 'LIKE':
        return '#FD9644';
      case 'COMMENT':
        return '#A55EEA';
      case 'FOLLOW':
        return '#2BCBBA';
      case 'CLAIM':
        return '#EB3B5A';
      default:
        return colors.accent;
    }
  };

  // Renderização dos botões de ação ao deslizar para a esquerda (excluir)
  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>, item: any) => {
    const translateX = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.deleteAction,
          {
            transform: [{ translateX }],
          },
        ]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.error }]}
          onPress={() => handleDeleteNotification(item.id)}
        >
          <Ionicons name="trash" size={24} color="white" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Renderizar item da notificação
  const renderItem = ({ item }: { item: any }) => (
    <Swipeable
      ref={(ref) => {
        if (item.id === notifications[0]?.id) swipeableRef.current = ref;
      }}
      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
      onSwipeableOpen={() => {
        if (swipeableRef.current && swipeableRef.current !== item) {
          swipeableRef.current.close();
        }
      }}
    >
      <TouchableOpacity
        style={[
          styles.notificationItem, 
          !item.read && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 107, 107, 0.05)' },
          // Destacar visualmente notificações de Pet encontrado
          item.type === 'PET_FOUND' && { 
            backgroundColor: isDark ? 'rgba(235, 59, 90, 0.15)' : 'rgba(235, 59, 90, 0.1)',
            borderLeftWidth: 4,
            borderLeftColor: '#EB3B5A'
          }
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[
          styles.iconContainer,
          { backgroundColor: getIconColor(item.type) }
        ]}>
          <Ionicons name={getNotificationIcon(item.type)} size={20} color="white" />
        </View>
        
        <View style={styles.notificationContent}>
          <ThemedText style={styles.notificationTitle} numberOfLines={1}>
            {item.title}
          </ThemedText>
          
          <ThemedText style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </ThemedText>
          
          <ThemedText style={styles.notificationTime}>
            {formatRelativeTime(new Date(item.createdAt))}
          </ThemedText>
        </View>
        
        {item.image && (
          <Image 
            source={{ uri: item.image }} 
            style={styles.notificationImage} 
            resizeMode="cover"
          />
        )}
        
        {!item.read && (
          <View style={[styles.unreadIndicator, { backgroundColor: colors.accent }]} />
        )}
      </TouchableOpacity>
    </Swipeable>
  );

  // Renderizar cabeçalho da lista
  const renderListHeader = () => {
    if (notifications.length === 0) return null;
    
    return (
      <View style={styles.listHeader}>
        <ThemedText style={styles.listTitle}>
          Notificações
        </ThemedText>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.headerButton, styles.markAllButton]}
            onPress={handleMarkAllAsRead}
          >
            <ThemedText style={{ color: colors.accent, fontSize: 14 }}>
              Marcar lidas
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleDeleteAllNotifications}
          >
            <ThemedText style={{ color: colors.error, fontSize: 14 }}>
              Limpar tudo
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Notificações',
          headerRight: () => (
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push('/settings/notifications')}
            >
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          )
        }} 
      />

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color={colors.error} />
          <ThemedText style={styles.errorText}>
            Ocorreu um erro ao carregar as notificações. Tente novamente.
          </ThemedText>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
            onPress={fetchNotifications}
          >
            <ThemedText style={styles.retryButtonText}>Tentar Novamente</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {!error && (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off"
              title="Nenhuma notificação"
              message="Você não tem notificações no momento"
              showButton={false}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
          contentContainerStyle={
            notifications.length === 0 ? { flex: 1 } : { paddingBottom: 20 }
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  settingsButton: {
    padding: 10,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
  },
  markAllButton: {
    marginRight: 5,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    opacity: 0.5,
  },
  notificationImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 16,
    right: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteAction: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  actionButton: {
    height: '100%',
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
});