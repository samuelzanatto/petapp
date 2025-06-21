import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, loginUser } from '../services/api';
import { initializeSocket, disconnectSocket } from '@/services/socket';
import { router } from 'expo-router';
import { registerForPushNotifications, unregisterPushNotifications } from '@/services/notifications';
import { getCurrentLocation } from '@/services/location';

type User = {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
};

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  authStatus: AuthStatus;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  updateUser: (data: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ 
  children: React.ReactNode, 
  initialAuthStatus?: AuthStatus 
}> = ({ children, initialAuthStatus = 'loading' }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(initialAuthStatus);
  const [loading, setLoading] = useState(initialAuthStatus === 'loading');

  // Inicializar dados do usuário apenas uma vez no carregamento do app
  useEffect(() => {
    console.log('[AuthProvider] Inicialização com status:', initialAuthStatus);
    
    if (initialAuthStatus === 'authenticated') {
      loadUserFromStorage();
    } else if (initialAuthStatus === 'unauthenticated') {
      setLoading(false);
    }
  }, [initialAuthStatus]);

  // Inicializar a localização do usuário
  const initializeUserLocation = async () => {
    try {
      console.log('[AuthProvider] Inicializando serviço de localização...');
      const location = await getCurrentLocation();
      console.log('[AuthProvider] Localização inicial obtida:', location.coords);
      return location;
    } catch (error) {
      console.error('[AuthProvider] Erro ao inicializar localização:', error);
      return null;
    }
  };

  const loadUserFromStorage = async () => {
    try {
      console.log('[AuthProvider] Carregando dados do usuário do storage...');
      const userToken = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (userToken && userData) {
        setUser(JSON.parse(userData));
        setAuthStatus('authenticated');

        // Inicializar serviços necessários
        await Promise.all([
          initializeSocket().then(success => 
            console.log('[AuthProvider] Socket inicializado:', success ? 'Sucesso' : 'Falha')
          ),
          initializeUserLocation(),
          registerForPushNotificationsIfNeeded()
        ]);
        
        // Verificar se o token ainda é válido (em background)
        validateUserToken(userToken).catch(error => {
          console.warn('[AuthProvider] Erro ao validar token:', error);
        });
      } else {
        setAuthStatus('unauthenticated');
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthProvider] Erro ao carregar dados do usuário:', error);
      setAuthStatus('unauthenticated');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Registrar para notificações push se ainda não estiver registrado
  const registerForPushNotificationsIfNeeded = async () => {
    try {
      const pushToken = await AsyncStorage.getItem('pushToken');
      if (!pushToken) {
        await registerForPushNotifications();
      }
      return true;
    } catch (pushError) {
      console.warn('[AuthProvider] Erro ao registrar para notificações:', pushError);
      return false;
    }
  };

  // Validar token do usuário sem bloquear o fluxo principal
  const validateUserToken = async (token: string) => {
    try {
      const profileData = await api.get('/users/profile/me');
      if (profileData && profileData.id) {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const updatedUserData = { ...JSON.parse(userData), ...profileData };
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
          setUser(updatedUserData);
        }
      }
      return true;
    } catch (error: any) {
      console.warn('[AuthProvider] Erro ao validar token:', error);
      if (error.message && error.message.includes('401')) {
        await signOut(false);
        return false;
      }
      return true;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('[AuthProvider] Iniciando login com email:', email);
      
      const response = await loginUser(email, password);
      const { user, token } = response;
      
      // Armazenar dados do usuário
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      setUser(user);
      setAuthStatus('authenticated');
      
      // Inicializar serviços em paralelo
      await Promise.all([
        initializeSocket(),
        initializeUserLocation(),
        registerForPushNotifications().catch(e => console.warn('[AuthProvider] Erro ao registrar push:', e))
      ]);
      
      // Verificar se precisa de onboarding
      const needsOnboarding = await checkOnboardingStatus();
      
      console.log('[AuthProvider] Login bem-sucedido, needsOnboarding:', needsOnboarding);
      
      return { needsOnboarding };
    } catch (error) {
      console.error('[AuthProvider] Erro ao fazer login:', error);
      setAuthStatus('unauthenticated');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      // Verificar se o usuário já tem pets cadastrados
      const response = await api.get('/pets');
      return !(response && Array.isArray(response) && response.length > 0);
    } catch (error: any) {
      console.log('[AuthProvider] Erro ao verificar status de onboarding:', error);
      return true;
    }
  };

  const signOut = async (redirect = true) => {
    try {
      setLoading(true);
      console.log('[AuthProvider] Realizando logout...');
      
      // Remover registro de notificações e limpar dados
      await unregisterPushNotifications();
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      disconnectSocket();
      setUser(null);
      setAuthStatus('unauthenticated');
      
      if (redirect) {
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('[AuthProvider] Erro ao fazer logout:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      console.log('[AuthProvider] Realizando cadastro para:', email);
      
      const response = await api.post('/auth/register', { name, email, password });
      const { user, token } = response;
      
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      setUser(user);
      setAuthStatus('authenticated');
      
      // Inicializar serviços em paralelo
      await Promise.all([
        initializeSocket(),
        initializeUserLocation(),
        registerForPushNotifications().catch(e => console.warn('[AuthProvider] Erro ao registrar push:', e))
      ]);
    } catch (error) {
      console.error('[AuthProvider] Erro ao fazer cadastro:', error);
      setAuthStatus('unauthenticated');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      initializeSocket();
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAuthenticated: authStatus === 'authenticated',
      authStatus,
      signIn, 
      signOut, 
      signUp, 
      updateUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};