import React from 'react';
import { View, Button, StyleSheet, Text, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { setupNotificationChannels } from '../services/notifications';

/**
 * Componente para testar o agrupamento de notificações de chat
 */
const TestNotificationGrouping = () => {
  /**
   * Função de teste para enviar múltiplas notificações que devem ser agrupadas
   */
  const testNotificationGrouping = async (chatRoomId = 'test-123', senderName = 'Usuário Teste') => {
    try {
      // Garantir que os canais estejam configurados
      setupNotificationChannels();
      
      // Mensagens de teste para enviar em sequência
      const testMessages = [
        'Primeira mensagem de teste',
        'Segunda mensagem para testar agrupamento',
        'Terceira mensagem para verificar o agrupamento'
      ];
      
      // Enviar várias notificações com pequeno atraso entre elas
      for (let i = 0; i < testMessages.length; i++) {
        const message = testMessages[i];
          // Dados comuns para agrupamento
        const notificationData = {
          type: 'CHAT',
          chatRoomId,
          senderId: 'test-user',
          sender_name: senderName,
          thread_id: `chat_${chatRoomId}`,
          group_key: `chat_${chatRoomId}`,
          group_id: `chat_${chatRoomId}`,
          category: 'CHAT',
          collapse_key: `chat_${chatRoomId}`
        };
        
        // Criar conteúdo da notificação com propriedades de plataforma
        const notificationContent = {
          title: `Mensagem de ${senderName}`,
          body: message,
          data: notificationData,
          sound: true,
          badge: 1,
        } as Notifications.NotificationContentInput;
        
        // Adicionar propriedades específicas de plataforma
        if (Platform.OS === 'android') {
          (notificationContent as any).android = {
            channelId: 'chat_channel'
          };
        } else if (Platform.OS === 'ios') {
          (notificationContent as any).ios = {
            threadId: `chat_${chatRoomId}`,
            categoryId: 'chat'
          };
        }
        
        await Notifications.scheduleNotificationAsync({
          content: notificationContent,
          trigger: null // Mostrar imediatamente
        });
        
        console.log(`Notificação de teste ${i+1} enviada`);
        
        // Usar um atraso manual entre notificações
        if (i < testMessages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      alert(`${testMessages.length} notificações foram enviadas. Observe como elas são agrupadas.`);
      return true;
    } catch (error) {
      console.error('Erro ao testar agrupamento de notificações:', error);
      alert('Não foi possível testar o agrupamento de notificações');
      return false;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Teste de Agrupamento de Notificações</Text>
      <Text style={styles.description}>
        Este botão enviará 3 notificações de teste que devem aparecer agrupadas
        em dispositivos com suporte a agrupamento de notificações.
      </Text>
      <Button 
        title="Testar Agrupamento" 
        onPress={() => testNotificationGrouping()} 
        color="#4CAF50"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  }
});

export default TestNotificationGrouping;
