import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from '@/constants/Config';

// Definição de interfaces
interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface ApiParams {
  [key: string]: string | number | boolean | undefined | null;
}

interface FileUpload {
  uri: string;
  name: string;
  type: string;
}

// Declaração de tipos para as imagens
type ImageArray = string[];

// Configuração base da API
const BASE_URL = API_URL || 'http://192.168.0.113:3000/api';

// Função auxiliar para adicionar token às requisições
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await AsyncStorage.getItem('userToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Função para construir URL completa
const buildUrl = (endpoint: string, params: ApiParams = {}): string => {
  // Iniciar com o endpoint básico
  let url = `${BASE_URL}${endpoint}`;
  
  // Adicionar parâmetros de consulta à URL
  const queryParams = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
    .join('&');
  
  // Adicionar os parâmetros à URL se existirem
  if (queryParams) {
    url += url.includes('?') ? `&${queryParams}` : `?${queryParams}`;
  }
  
  return url;
};

// Funções auxiliares para requisições HTTP
const fetchApi = async (endpoint: string, options: RequestOptions = {}): Promise<any> => {
  try {
    // Obter os headers de autenticação
    const headers = await getAuthHeaders();
    
    // Configurar os headers da requisição
    const requestHeaders = {
      ...headers,
      ...(options.headers || {}),
    };
    
    // Garantir que o Content-Type seja correto para FormData
    if (options.body instanceof FormData) {
      delete requestHeaders['Content-Type']; // Deixar que o navegador/fetch configure o boundary correto
    }
    
    // Log completo para depuração
    const fullUrl = `${BASE_URL}${endpoint}`;
    console.log(`[API] Tentando requisição para ${fullUrl}`, {
      method: options.method || 'GET',
      headers: requestHeaders,
      bodyType: options.body ? (options.body instanceof FormData ? 'FormData' : 'JSON') : 'none',
      env: __DEV__ ? 'development' : 'production'
    });
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: requestHeaders,
    });
    
    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Criar um erro personalizado que mantém a estrutura original da resposta
      const customError: any = new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      customError.response = { 
        data: errorData,
        status: response.status
      };
      throw customError;
    }
    
    // Para requisições que não retornam JSON
    if (response.status === 204) {
      return {};
    }
    
    // Verificar se há conteúdo antes de converter para JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return {};
  } catch (error) {
    console.error(`[API] Erro na requisição para ${endpoint}:`, error);
    // Registra detalhes mais completos do erro para ajudar na depuração
    if (error instanceof Error) {
      console.error(`[API] Detalhes do erro: ${error.name}: ${error.message}`);
      console.error(`[API] Stack trace: ${error.stack}`);
    }
    // Registra informações do ambiente
    console.error(`[API] Ambiente: ${__DEV__ ? 'development' : 'production'}`);
    console.error(`[API] URL base: ${BASE_URL}`);
    
    throw error;
  }
};

// Funções HTTP básicas
const get = async (endpoint: string, params: ApiParams = {}): Promise<any> => {
  // Usar a função buildUrl para criar a URL com parâmetros
  const url = Object.keys(params).length > 0 
    ? endpoint + '?' + Object.keys(params)
        .filter(key => params[key] !== undefined && params[key] !== null)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
        .join('&')
    : endpoint;
    
  return fetchApi(url, { method: 'GET' });
};

const post = async (endpoint: string, data: any = {}, headers: Record<string, string> = {}): Promise<any> => {
  return fetchApi(endpoint, {
    method: 'POST',
    headers,
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
};

const put = async (endpoint: string, data: any = {}, headers: Record<string, string> = {}): Promise<any> => {
  return fetchApi(endpoint, {
    method: 'PUT',
    headers,
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
};

const del = async (endpoint: string, data: any = null): Promise<any> => {
  return fetchApi(endpoint, { 
    method: 'DELETE',
    body: data ? JSON.stringify(data) : undefined
  });
};

// Exportar URL base para uso externo
export const api = {
  BASE_URL,
  get,
  post,
  put,
  del,
  fetchApi,
  upload: async (endpoint: string, formData: FormData): Promise<any> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      return fetchApi(endpoint, {
        method: 'POST',
        headers,
        body: formData
      });
    } catch (error) {
      console.error(`Erro no upload para ${endpoint}:`, error);
      throw error;
    }
  }
};

// Funções para autenticação e usuários
export const registerUser = async (userData: Record<string, any>): Promise<any> => {
  return post('/auth/register', userData);
};

export const loginUser = async (email: string, password: string): Promise<any> => {
  console.log('loginUser chamado com:', { email, password: '******' });
  
  // Verificar se os parâmetros estão sendo passados corretamente
  if (!email) {
    throw new Error('Email não fornecido para loginUser');
  }
  
  if (!password) {
    throw new Error('Senha não fornecida para loginUser');
  }
  
  // Usar JSON.stringify explicitamente para garantir que o objeto está corretamente formatado
  const data = JSON.stringify({ email, password });
  
  return fetchApi('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: data
  });
};

export const getUser = async (userId: string): Promise<any> => {
  try {
    return await get(`/users/profile/${userId}`);
  } catch (error: any) {
    // Melhorar a mensagem de erro para usuário não encontrado
    if (error.message && error.message.includes('404')) {
      console.warn(`Usuário com ID ${userId} não encontrado`);
      throw new Error(`Usuário não encontrado. O ID ${userId} não existe na base de dados.`);
    }
    throw error;
  }
};

export const updateUser = async (userData: Record<string, any>): Promise<any> => {
  return put('/users', userData);
};

export const uploadProfileImage = async (imageUri: string): Promise<any> => {
  const formData = new FormData();
  
  // Extrair extensão do arquivo
  const filename = imageUri.split('/').pop() || 'profile_image.jpg';
  const fileExt = imageUri.split('.').pop() || 'jpg';
  
  // Adicionar arquivo ao FormData
  // @ts-ignore - React Native's FormData differes from standard web FormData
  formData.append('profileImage', {
    uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
    name: filename,
    type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
  } as any);
  
  return post('/users/profile-image', formData, {
    'Content-Type': 'multipart/form-data',
  });
};

// Funções para pets
export const getUserPets = async (): Promise<any> => {
  return get('/pets');
};

export const getPet = async (petId: string): Promise<any> => {
  return get(`/pets/${petId}`);
};

export const createPet = async (petData: Record<string, any>, images: ImageArray): Promise<any> => {
  const formData = new FormData();
  
  // Adicionar campos de texto
  Object.keys(petData).forEach(key => {
    if (petData[key] !== undefined && petData[key] !== null) {
      formData.append(key, String(petData[key]));
    }
  });
  
  // Adicionar imagens
  if (images && images.length > 0) {
    images.forEach((image: string, index: number) => {
      const filename = image.split('/').pop() || `pet_image_${index}.jpg`;
      const fileExt = image.split('.').pop() || 'jpg';
      
      // @ts-ignore - React Native's FormData differes from standard web FormData
      formData.append('images', {
        uri: Platform.OS === 'android' ? image : image.replace('file://', ''),
        name: filename,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
      } as any);
    });
  }
  
  return post('/pets', formData, {
    'Content-Type': 'multipart/form-data',
  });
};

export const updatePet = async (petId: string, petData: Record<string, any>, newImages: ImageArray = []): Promise<any> => {
  const formData = new FormData();
  
  // Adicionar campos de texto
  Object.keys(petData).forEach(key => {
    if (petData[key] !== undefined && petData[key] !== null) {
      formData.append(key, String(petData[key]));
    }
  });
  
  // Adicionar novas imagens
  if (newImages && newImages.length > 0) {
    newImages.forEach((image: string, index: number) => {
      // Verificar se a imagem já é uma URL do servidor
      if (image.startsWith('http')) {
        return;
      }
      
      const filename = image.split('/').pop() || `pet_image_${index}.jpg`;
      const fileExt = image.split('.').pop() || 'jpg';
      
      // @ts-ignore - React Native's FormData differes from standard web FormData
      formData.append('images', {
        uri: Platform.OS === 'android' ? image : image.replace('file://', ''),
        name: filename,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
      } as any);
    });
  }
  
  return put(`/pets/${petId}`, formData, {
    'Content-Type': 'multipart/form-data',
  });
};

export const deletePet = async (petId: string): Promise<any> => {
  return del(`/pets/${petId}`);
};

// Funções para alertas de pets perdidos/encontrados
export const createAlert = async (alertData: Record<string, any>, images: ImageArray): Promise<any> => {
  const formData = new FormData();
  
  // Adicionar campos de texto
  Object.keys(alertData).forEach(key => {
    if (alertData[key] !== undefined && alertData[key] !== null) {
      formData.append(key, String(alertData[key]));
    }
  });
  
  // Adicionar imagens
  if (images && images.length > 0) {
    images.forEach((image: string, index: number) => {
      const filename = image.split('/').pop() || `alert_image_${index}.jpg`;
      const fileExt = image.split('.').pop() || 'jpg';
      
      // @ts-ignore - React Native's FormData differes from standard web FormData
      formData.append('images', {
        uri: Platform.OS === 'android' ? image : image.replace('file://', ''),
        name: filename,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
      } as any);
    });
  }
  
  return post('/alerts', formData, {
    'Content-Type': 'multipart/form-data',
  });
};

export const getUserAlerts = async (): Promise<any> => {
  return get('/alerts/user');
};

export const getNearbyAlerts = async (lat: number, lng: number, radius: number = 20, alertType: string | null = null): Promise<any> => {
  const params: ApiParams = { lat, lng, radius };
  if (alertType) {
    params['alertType'] = alertType;
  }
  
  return get('/alerts/nearby', params);
};

export const getAlerts = async (filters: ApiParams = {}): Promise<any> => {
  return get('/alerts', filters);
};

export const getAlert = async (alertId: string): Promise<any> => {
  return get(`/alerts/${alertId}`);
};

export const updateAlert = async (alertId: string, alertData: Record<string, any>): Promise<any> => {
  return put(`/alerts/${alertId}`, alertData);
};

export const resolveAlert = async (alertId: string, resolution: Record<string, any>): Promise<any> => {
  return post(`/alerts/${alertId}/resolve`, { resolution });
};

export const deleteAlert = async (alertId: string): Promise<any> => {
  return del(`/alerts/${alertId}`);
};

// Funções para reivindicações (claims)
export const createPetClaim = async (alertId: string, alertType: string, verificationDetails: Record<string, any>, verificationImages: ImageArray): Promise<any> => {
  // Log para depuração
  console.log('Criando reivindicação para alertId:', alertId, 'tipo:', alertType);
  
  // Validar se alertId foi fornecido
  if (!alertId) {
    console.error('Erro: alertId não fornecido');
    throw new Error('ID do alerta é obrigatório para criar uma reivindicação');
  }
  
  // Validar se alertType é válido
  if (!alertType || !['FOUND', 'LOST'].includes(alertType)) {
    console.error(`Erro: tipo de alerta inválido: "${alertType}"`);
    throw new Error('Tipo de alerta inválido. Deve ser FOUND ou LOST');
  }
  
  // Validar os detalhes de verificação
  if (!verificationDetails || !verificationDetails.petFeatures || verificationDetails.petFeatures.trim().length < 10) {
    throw new Error('Por favor, forneça detalhes suficientes sobre o pet para verificação');
  }
  
  // Verificar se já existe uma reivindicação pendente para este alerta
  try {
    const existingClaims = await getClaims();
    const hasPendingClaim = existingClaims.some((claim: any) => 
      claim.alertId === alertId && 
      ['PENDING', 'APPROVED'].includes(claim.status)
    );
    
    if (hasPendingClaim) {
      throw new Error('Você já tem uma reivindicação pendente ou aprovada para este pet');
    }
  } catch (checkError) {
    // Se ocorrer um erro ao verificar reivindicações existentes, continuamos com a criação
    console.log('Erro ao verificar reivindicações existentes:', checkError);
  }
  
  const formData = new FormData();
  
  // Adicionar alertId ao FormData
  formData.append('alertId', alertId);
  
  // Adicionar alertType ao FormData
  formData.append('alertType', alertType);
  console.log(`Enviando reivindicação com alertId=${alertId} e alertType=${alertType}`);
  
  // Adicionar detalhes de verificação como JSON string 
  formData.append('verificationDetails', JSON.stringify(verificationDetails));
  
  // Adicionar imagens de verificação
  if (verificationImages && verificationImages.length > 0) {
    verificationImages.forEach((image: string, index: number) => {
      const filename = image.split('/').pop() || `verification_${index}.jpg`;
      const fileExt = image.split('.').pop() || 'jpg';
      
      // @ts-ignore - React Native's FormData differes from standard web FormData
      formData.append('verificationImages', {
        uri: Platform.OS === 'android' ? image : image.replace('file://', ''),
        name: filename,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
      } as any);
    });
  }
  
  try {
    // Obter token de autenticação manualmente
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      throw new Error('Autenticação necessária para criar uma reivindicação');
    }
    
    // Verificar se há imagens suficientes
    if (!verificationImages || verificationImages.length === 0) {
      throw new Error('Por favor, adicione pelo menos uma imagem para comprovar a propriedade do pet');
    }
    
    const response = await fetchApi('/claims', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    console.log('Resposta da criação de reivindicação:', response);
    
    // Verificar se a resposta foi bem-sucedida
    if (!response || (!response.claim && !response.message)) {
      throw new Error('Resposta inválida do servidor');
    }
    
    return response;
  } catch (error: any) {
    console.error('Erro ao criar reivindicação:', error);
    
    // Melhorar mensagens de erro
    if (error.message && error.message.includes('already has a pending claim')) {
      throw new Error('Você já tem uma reivindicação pendente para este pet');
    } else if (error.message && error.message.includes('own pet')) {
      throw new Error('Você não pode reivindicar seu próprio pet');
    }
    
    throw error;
  }
};

export const getClaims = async (filters: ApiParams = {}): Promise<any> => {
  return get('/claims', filters);
};

export const getClaim = async (claimId: string): Promise<any> => {
  return get(`/claims/${claimId}`);
};

export const createClaim = async (claimData: Record<string, any>, images: ImageArray = []): Promise<any> => {
  const formData = new FormData();
  
  // Adicionar campos de texto
  Object.keys(claimData).forEach(key => {
    if (claimData[key] !== undefined && claimData[key] !== null) {
      formData.append(key, String(claimData[key]));
    }
  });
  
  // Adicionar imagens de prova
  if (images && images.length > 0) {
    images.forEach((image: string, index: number) => {
      const filename = image.split('/').pop() || `claim_proof_${index}.jpg`;
      const fileExt = image.split('.').pop() || 'jpg';
      
      // @ts-ignore - React Native's FormData differes from standard web FormData
      formData.append('proofImages', {
        uri: Platform.OS === 'android' ? image : image.replace('file://', ''),
        name: filename,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
      } as any);
    });
  }
  
  return post('/claims', formData, {
    'Content-Type': 'multipart/form-data',
  });
};

export const updateClaim = async (claimId: string, claimData: Record<string, any>, newImages: ImageArray = []): Promise<any> => {
  const formData = new FormData();
  
  // Adicionar campos de texto
  Object.keys(claimData).forEach(key => {
    if (claimData[key] !== undefined && claimData[key] !== null) {
      formData.append(key, String(claimData[key]));
    }
  });
  
  // Adicionar novas imagens
  if (newImages && newImages.length > 0) {
    newImages.forEach((image: string, index: number) => {
      // Verificar se a imagem já é uma URL do servidor
      if (image.startsWith('http')) {
        return;
      }
      
      const filename = image.split('/').pop() || `claim_proof_${index}.jpg`;
      const fileExt = image.split('.').pop() || 'jpg';
      
      // @ts-ignore - React Native's FormData differes from standard web FormData
      formData.append('proofImages', {
        uri: Platform.OS === 'android' ? image : image.replace('file://', ''),
        name: filename,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
      } as any);
    });
  }
  
  return put(`/claims/${claimId}`, formData, {
    'Content-Type': 'multipart/form-data',
  });
};

export const respondToClaim = async (claimId: string, response: Record<string, any>): Promise<any> => {
  return post(`/claims/${claimId}/respond`, { response });
};

export const deleteClaim = async (claimId: string): Promise<any> => {
  return del(`/claims/${claimId}`);
};

export const getUserClaims = async (): Promise<any> => {
  return get('/claims');
};

export const getReceivedClaims = async (): Promise<any> => {
  return get('/claims/received');
};

export const getPetClaimById = async (claimId: string): Promise<any> => {
  return get(`/claims/${claimId}`);
};

export const verifyPetClaim = async (claimId: string, action: string, details: Record<string, any>): Promise<any> => {
  return post(`/claims/${claimId}/verify`, {
    action, // 'APPROVE' ou 'REJECT'
    ...details
  });
};

export const completePetClaim = async (claimId: string): Promise<any> => {
  return post(`/claims/${claimId}/complete`);
};

export const cancelPetClaim = async (claimId: string): Promise<any> => {
  return post(`/claims/${claimId}/cancel`);
};

// Funções para detalhes e atualização de status de reivindicações
export const getClaimDetails = async (claimId: string): Promise<any> => {
  try {
    console.log(`Buscando detalhes da reivindicação ${claimId}`);
    const data = await get(`/claims/${claimId}/details`);
    console.log('Resposta detalhes da reivindicação:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error(`Erro ao buscar detalhes da reivindicação ${claimId}:`, error);
    throw error;
  }
};

export const updateClaimStatus = async (claimId: string, newStatus: string, comment: string): Promise<any> => {
  return post(`/claims/${claimId}/status`, { 
    status: newStatus,
    comment
  });
};

// Funções para posts
export const getPosts = async (page: number = 1, limit: number = 10): Promise<any> => {
  return get(`/posts`, { page, limit });
};

export const getUserPosts = async (userId: string, page: number = 1, limit: number = 10): Promise<any> => {
  return get(`/posts/user/${userId}`, { page, limit });
};

export const getPost = async (postId: string): Promise<any> => {
  return get(`/posts/${postId}`);
};

export const createPost = async (postData: Record<string, any>, images: ImageArray): Promise<any> => {
  try {
    const formData = new FormData();
    
    // Adicionar campos de texto
    Object.keys(postData).forEach(key => {
      if (postData[key] !== undefined && postData[key] !== null) {
        formData.append(key, String(postData[key]));
      }
    });
    
    // Adicionar imagens
    if (images && images.length > 0) {
      images.forEach((image: string, index: number) => {
        const filename = image.split('/').pop() || `post_image_${index}.jpg`;
        const fileExt = image.split('.').pop() || 'jpg';
        
        // @ts-ignore - React Native's FormData differes from standard web FormData
        formData.append('images', {
          uri: Platform.OS === 'android' ? image : image.replace('file://', ''),
          name: filename,
          type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
        } as any);
      });
    }
    
    // Obter token de autenticação manualmente
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      throw new Error('Autenticação necessária para criar um post');
    }
    
    // Fazer a requisição com o token incluído nos headers
    const response = await fetchApi('/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    return response;
  } catch (error) {
    console.error('Erro ao criar post:', error);
    throw error;
  }
};

export const updatePost = async (postId: string, postData: Record<string, any>): Promise<any> => {
  return put(`/posts/${postId}`, postData);
};

export const deletePost = async (postId: string): Promise<any> => {
  return del(`/posts/${postId}`);
};

export const likePost = async (postId: string): Promise<any> => {
  return post(`/posts/${postId}/like`);
};

export const unlikePost = async (postId: string): Promise<any> => {
  return del(`/posts/${postId}/like`);
};

export const commentOnPost = async (postId: string, text: string): Promise<any> => {
  return post(`/posts/${postId}/comments`, { text });
};

export const getPostComments = async (postId: string): Promise<any> => {
  return get(`/posts/${postId}/comments`);
};

export const deleteComment = async (postId: string, commentId: string): Promise<any> => {
  return del(`/posts/${postId}/comments/${commentId}`);
};

// Funções para seguir usuários
export const followUser = async (userId: string): Promise<any> => {
  return post(`/users/${userId}/follow`);
};

export const unfollowUser = async (userId: string): Promise<any> => {
  return del(`/users/${userId}/follow`);
};

export const getFollowers = async (userId: string): Promise<any> => {
  return get(`/users/${userId}/followers`);
};

export const getFollowing = async (userId: string): Promise<any> => {
  return get(`/users/${userId}/following`);
};

// Funções para mensagens e chats
export const getUserChats = async (): Promise<any> => {
  return get('/chat/rooms');
};

export const getChat = async (chatId: string): Promise<any> => {
  return get(`/chat/rooms/${chatId}`);
};

export const getChatMessages = async (chatId: string, limit: number = 20, before: string | null = null): Promise<any> => {
  const params: ApiParams = { limit };
  if (before) {
    params['before'] = before;
  }
  
  return get(`/chat/rooms/${chatId}/messages`, params);
};

export const sendMessage = async (chatId: string, message: string): Promise<any> => {
  return post(`/chat/rooms/${chatId}/messages`, { content: message });
};

export const createChat = async (userId: string): Promise<any> => {
  return post('/chat/rooms', { participantId: userId });
};

// Nova função para criar ou obter chat direto baseado em reivindicação aprovada
export const getDirectChat = async (userId: string): Promise<any> => {
  try {
    const response = await get(`/chat/direct/${userId}`);
    return response;
  } catch (error) {
    console.error('Erro ao obter chat direto:', error);
    throw error;
  }
};

// Funções para notificações
export const getNotifications = async (): Promise<any> => {
  return get('/notifications');
};

export const markNotificationAsRead = async (notificationId: string): Promise<any> => {
  return put(`/notifications/${notificationId}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<any> => {
  return put('/notifications/read-all');
};

export const registerPushToken = async (token: string): Promise<any> => {
  return post('/notifications/push-token', { token });
};

// Nova função para atualizar localização do usuário
export const updateUserLocation = async (latitude: number, longitude: number): Promise<any> => {
  try {
    console.log('Atualizando localização do usuário:', { latitude, longitude });
    return put('/users/location', { latitude, longitude });
  } catch (error) {
    console.error('Erro ao atualizar localização do usuário:', error);
    throw error;
  }
};