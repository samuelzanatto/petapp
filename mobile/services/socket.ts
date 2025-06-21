import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/Config';

let socket: Socket | null = null;

const getSocketUrl = () => {
  const baseUrl = API_URL.includes('/api') 
    ? API_URL.substring(0, API_URL.lastIndexOf('/api'))
    : API_URL;
    
  return baseUrl;
};

export const initializeSocket = async () => {
  try {
    if (socket && socket.connected) {
      console.log('Socket já conectado');
      return socket;
    }
    
    const token = await AsyncStorage.getItem('userToken');
    
    if (!token) {
      console.log('Não foi possível inicializar socket: token não encontrado');
      return null;
    }
    
    // Conectar ao socket com token de autenticação
    socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket'],
    });
    
    socket.on('connect', () => {
      console.log('Conectado ao socket.io');
    });
    
    socket.on('connect_error', (error) => {
      console.error('Erro ao conectar com socket.io:', error);
    });
    
    return socket;
  } catch (error) {
    console.error('Erro ao inicializar socket:', error);
    return null;
  }
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const subscribeToChat = (chatRoomId: string) => {
  if (!socket) return;
  
  console.log(`Inscrevendo-se na sala: chat:${chatRoomId}`);
  socket.emit('join-chat-room', { chatRoomId });
};

export const unsubscribeFromChat = (chatRoomId: string) => {
  if (!socket) return;
  
  socket.emit('leave-chat-room', { chatRoomId });
};

// Melhorar a função de envio de mensagens
export const sendChatMessage = (chatRoomId: string, content: string): boolean => {
  if (!socket) {
    console.error('❌ Não foi possível enviar mensagem: Socket não inicializado');
    return false;
  }
  
  if (!socket.connected) {
    console.error('❌ Não foi possível enviar mensagem: Socket desconectado');
    return false;
  }
  
  console.log(`📤 Enviando mensagem via socket para sala ${chatRoomId}:`, content);
  socket.emit('chat-message', { chatRoomId, content });
  return true;
};

export const sendTypingStatus = (chatRoomId: string, isTyping: boolean): boolean => {
  if (!socket || !socket.connected) {
    return false;
  }
  
  socket.emit('typing-status', { chatRoomId, isTyping });
  return true;
};

export const emitLostPetAlert = (petId: string, latitude: number, longitude: number) => {
  if (socket) {
    socket.emit('lost-pet-alert', { petId, latitude, longitude });
  }
};