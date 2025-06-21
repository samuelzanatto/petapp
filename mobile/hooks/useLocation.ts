import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';
import { useAuth } from '@/contexts/auth';
import { updateUserLocation } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const initAttemptedRef = useRef<boolean>(false);

  // Geocodificação reversa para obter nome do local a partir de coordenadas
  const getLocationName = useCallback(async (latitude: number, longitude: number) => {
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });
      
      if (address) {
        const locationParts = [
          address.street,
          address.district,
          address.subregion,
          address.city
        ].filter(Boolean);
        
        return locationParts.join(', ');
      }
      
      return null;
    } catch (error) {
      console.error('Erro na geocodificação reversa:', error);
      return null;
    }
  }, []);

  // Função para sincronizar localização com o backend de forma forçada
  const forceSyncLocation = useCallback(async (newLocation: Location.LocationObject) => {
    try {
      // Verificar se o usuário está logado
      if (!user) {
        console.log('Usuário não logado, localização não será sincronizada');
        return;
      }

      console.log('Forçando sincronização de localização com backend...');
      
      // Enviar localização para o backend sem verificar tempo desde última atualização
      const response = await updateUserLocation(
        newLocation.coords.latitude,
        newLocation.coords.longitude
      );
      
      console.log('Localização sincronizada com o backend (força):', response);
      lastSyncTimeRef.current = Date.now();
      
      // Salvar horário da última sincronização no storage
      await AsyncStorage.setItem('lastLocationSync', lastSyncTimeRef.current.toString());
      
      return response;
    } catch (error) {
      console.error('Erro ao sincronizar localização com o backend:', error);
    }
  }, [user]);

  // Função para sincronizar localização com o backend
  const syncLocationWithBackend = useCallback(async (newLocation: Location.LocationObject) => {
    try {
      // Verificar se o usuário está logado
      if (!user) {
        console.log('Usuário não logado, localização não será sincronizada');
        return;
      }

      // Limitar a frequência de sincronização para no máximo a cada 5 minutos
      const now = Date.now();
      if (now - lastSyncTimeRef.current < 5 * 60 * 1000) {
        console.log('Sincronização recente, aguardando intervalo mínimo');
        return;
      }

      // Enviar localização para o backend
      const response = await updateUserLocation(
        newLocation.coords.latitude,
        newLocation.coords.longitude
      );
      
      console.log('Localização sincronizada com o backend:', response);
      lastSyncTimeRef.current = now;
      
      // Salvar horário da última sincronização no storage
      await AsyncStorage.setItem('lastLocationSync', lastSyncTimeRef.current.toString());
    } catch (error) {
      console.error('Erro ao sincronizar localização com o backend:', error);
    }
  }, [user]);

  // Função para solicitar permissões de localização
  const requestLocationPermissions = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('Permissão de localização negada');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissões de localização:', error);
      setErrorMsg('Falha ao solicitar permissões de localização');
      return false;
    }
  }, []);

  // Iniciar o monitoramento da localização
  const startLocationTracking = useCallback(async () => {
    try {
      // Limpar qualquer assinatura anterior
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) {
        return;
      }

      // Usar alta precisão para garantir que as mudanças no emulador sejam capturadas
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,        // Verificar a cada 5 segundos
          distanceInterval: 5,       // Ou quando mover 5 metros
          mayShowUserSettingsDialog: true
        },
        (newLocation) => {
          console.log('Nova localização detectada:', newLocation.coords);
          setLocation(newLocation);
          
          // Sincronizar com o backend quando a localização mudar
          syncLocationWithBackend(newLocation);
          
          // Atualizar o nome da localização quando as coordenadas mudarem
          getLocationName(
            newLocation.coords.latitude, 
            newLocation.coords.longitude
          ).then(name => {
            if (name) setLocationName(name);
          });
        }
      );
      
      console.log('Monitoramento de localização iniciado');
    } catch (error) {
      console.error('Erro ao iniciar monitoramento de localização:', error);
      setErrorMsg('Falha ao monitorar sua localização');
    }
  }, [requestLocationPermissions, syncLocationWithBackend, getLocationName]);

  // Obter localização atual do usuário
  const getCurrentLocation = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) {
        setLoading(false);
        return null;
      }
      
      // Usar configuração de alta precisão para captar mudanças no emulador
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      console.log('Localização atual obtida:', location.coords);
      setLocation(location);
      
      // Forçar sincronização com o backend na inicialização
      await forceSyncLocation(location);
      
      // Reverter geocodificação para obter nome do local
      try {
        const addressInfo = await getLocationName(
          location.coords.latitude,
          location.coords.longitude
        );
        
        setLocationName(addressInfo);
      } catch (error) {
        console.error('Erro ao obter nome da localização:', error);
      }
      
      // Iniciar o monitoramento contínuo da localização
      startLocationTracking();
      
      return location;
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      setErrorMsg('Não foi possível obter sua localização');
      return null;
    } finally {
      setLoading(false);
    }
  }, [requestLocationPermissions, forceSyncLocation, startLocationTracking, getLocationName]);

  // Carregar localização inicial ao montar o componente
  useEffect(() => {
    if (user && !initAttemptedRef.current) {
      console.log('useLocation: Usuário autenticado, inicializando localização...');
      initAttemptedRef.current = true;
      getCurrentLocation();
    }
    
    // Limpar a assinatura de localização quando o componente for desmontado
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        console.log('useLocation: Assinatura de localização removida');
      }
    };
  }, [user, getCurrentLocation]);

  // Função adicional para forçar uma atualização manual da localização
  const updateLocation = useCallback(async () => {
    try {
      console.log('Atualizando localização manualmente...');
      const location = await getCurrentLocation();
      if (location) {
        console.log('Localização atualizada manualmente com sucesso');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao atualizar localização manualmente:', error);
      return false;
    }
  }, [getCurrentLocation]);

  // Calcular distância entre duas coordenadas em metros
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    // Implementação da fórmula de Haversine
    const R = 6371e3; // raio da Terra em metros
    const φ1 = lat1 * Math.PI/180; // φ, λ em radianos
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distance = R * c; // em metros
    return distance;
  }, []);

  // Converter distância para formato legível
  const formatDistance = useCallback((distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  }, []);

  // Verificar se localização é recente (menos de 5 minutos)
  const isLocationRecent = useCallback(() => {
    if (!location) return false;
    
    const locationTime = new Date(location.timestamp).getTime();
    const now = new Date().getTime();
    const fiveMinutes = 5 * 60 * 1000;
    
    return now - locationTime < fiveMinutes;
  }, [location]);

  return {
    location,
    locationName,
    errorMsg,
    loading,
    getCurrentLocation,
    calculateDistance,
    formatDistance,
    getLocationName,
    isLocationRecent,
    startLocationTracking,
    updateLocation,
    forceSyncLocation
  };
}