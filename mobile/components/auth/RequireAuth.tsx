import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import { View, ActivityIndicator } from 'react-native';

interface RequireAuthProps {
  children: React.ReactNode;
  fallbackRoute?: string;
}

/**
 * Componente de proteção de rota que garante que apenas usuários autenticados 
 * possam acessar o conteúdo protegido.
 * 
 * Se o usuário estiver autenticado, renderiza o conteúdo protegido.
 * Se estiver carregando, mostra um indicador de carregamento.
 * Se não estiver autenticado, redireciona para a rota de fallback (padrão: /auth/login).
 */
export function RequireAuth({ children, fallbackRoute = '/auth/login' }: RequireAuthProps) {
  const { isAuthenticated, loading, authStatus } = useAuth();

  // Logs para depuração
  useEffect(() => {
    console.log('[RequireAuth] Status de autenticação:', authStatus);
    console.log('[RequireAuth] Carregando:', loading);
    console.log('[RequireAuth] Autenticado:', isAuthenticated);
  }, [authStatus, loading, isAuthenticated]);

  // Enquanto estiver verificando a autenticação, mostrar carregamento
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  // Se não estiver autenticado, redirecionar para tela de login
  if (!isAuthenticated) {
    console.log('[RequireAuth] Redirecionando para:', fallbackRoute);
    return <Redirect href={fallbackRoute} />;
  }

  // Se estiver autenticado, renderizar o conteúdo protegido
  return <>{children}</>;
}

export default RequireAuth;