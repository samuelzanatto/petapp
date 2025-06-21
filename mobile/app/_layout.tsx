import 'react-native-gesture-handler';
import { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import { Slot, SplashScreen, Redirect, Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Providers
import { AuthProvider } from '@/contexts/auth';
import { ThemeProvider, useTheme } from '@/contexts/theme';
import { LocationProvider } from '@/contexts/location';

// Serviços e hooks
import { initializeFirebase, setupBackgroundMessageHandler } from '@/services/notifications';
import { useFonts } from 'expo-font';
import { LogBox } from 'react-native';

// Impedir que a SplashScreen seja escondida automaticamente
SplashScreen.preventAutoHideAsync().catch(() => {});

// Ignorar warnings específicos
LogBox.ignoreLogs(['Warning: ...']); // Ajustar conforme necessário

export default function RootLayout() {
  // Carregar fontes necessárias
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Light': require('@/assets/fonts/Inter-Light.ttf'),
    'Inter-Regular': require('@/assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('@/assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('@/assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('@/assets/fonts/Inter-Bold.ttf'),
  });

  // Verificação de autenticação inicial
  const [authStatus, setAuthStatus] = useState<'loading' | 'unauthenticated' | 'authenticated'>('loading');
  const [appIsReady, setAppIsReady] = useState(false);

  // Inicialização do app e verificação de autenticação 
  useEffect(() => {
    async function prepare() {
      try {
        // Inicializar serviços do Firebase
        initializeFirebase();
        setupBackgroundMessageHandler();

        // Verificar estado de autenticação diretamente pelo token 
        const userToken = await AsyncStorage.getItem('userToken');
        const authResult = userToken ? 'authenticated' : 'unauthenticated';
        
        console.log('[RootLayout] Estado de autenticação inicial:', authResult);
        setAuthStatus(authResult);

        // Delay para garantir que a splash screen seja exibida tempo suficiente 
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn('[RootLayout] Erro na inicialização:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Ocultar a splash screen quando tudo estiver pronto 
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && fontsLoaded) {
      console.log('[RootLayout] App está pronto, escondendo splash screen...');
      await SplashScreen.hideAsync();
    }
  }, [appIsReady, fontsLoaded]);

  // Não renderizar nada até que as fontes estejam carregadas e verificação inicial de autenticação concluída 
  if (!appIsReady || !fontsLoaded) {
    return null;
  }

  // Redirecionar com base no estado de autenticação 
  let initialRoute;
  if (authStatus === 'unauthenticated') {
    initialRoute = '/auth/login';
  } else {
    initialRoute = '/(tabs)';
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ThemeProvider>
        <AuthProvider initialAuthStatus={authStatus}>
          <LocationProvider>
            <RootLayoutNav initialRoute={initialRoute} />
          </LocationProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Componente de navegação com redirecionamento inicial
function RootLayoutNav({ initialRoute }: { initialRoute: string }) {
  const { isDark } = useTheme();
  
  // Ajustar a cor de fundo do sistema operacional
  SystemUI.setBackgroundColorAsync(isDark ? '#121212' : '#FFFFFF');

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#FFFFFF' }}>
      {/* Configurar Stack global com animações explícitas */}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'default',
          animationDuration: 300,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          presentation: 'card',
          contentStyle: {
            backgroundColor: isDark ? '#121212' : '#FFFFFF',
          }
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="camera" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="claims" options={{ headerShown: false }} />
        <Stack.Screen name="follow" options={{ headerShown: false }} />
        <Stack.Screen name="pet" options={{ headerShown: false }} />
        <Stack.Screen name="post" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
      
      {/* Redirecionamento inicial baseado no estado de autenticação */}
      <Redirect href={initialRoute} />
      
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </View>
  );
}