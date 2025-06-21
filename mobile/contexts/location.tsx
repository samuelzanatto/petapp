import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { LocationObject, LocationSubscription } from 'expo-location';
import { getCurrentLocation, watchLocation } from '../services/location';
import { updateUserLocation } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermission as requestPermission } from '../utils/permissions';

type LocationContextType = {
  location: LocationObject | null;
  errorMsg: string | null;
  refreshLocation: () => Promise<void>;
  requestLocationPermission: () => Promise<boolean>;
};

const LocationContext = createContext<LocationContextType>({
  location: null,
  errorMsg: null,
  refreshLocation: async () => {},
  requestLocationPermission: async () => false,
});

export const LocationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [location, setLocation] = useState<LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const locationWatcherRef = useRef<(() => void) | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  // Função para enviar coordenadas para o backend
  const syncLocationWithBackend = async (newLocation: LocationObject) => {
    try {
      // Verificar se o usuário está autenticado
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('Usuário não autenticado, localização não será sincronizada');
        return;
      }

      // Limitar a frequência de sincronização para no máximo a cada 5 minutos
      const now = Date.now();
      if (now - lastSyncTimeRef.current < 5 * 60 * 1000) {
        console.log('Sincronização recente, aguardando intervalo mínimo');
        return;
      }

      // Sincronizar localização com o backend
      const response = await updateUserLocation(
        newLocation.coords.latitude, 
        newLocation.coords.longitude
      );
      
      console.log('Localização sincronizada com o backend:', response);
      lastSyncTimeRef.current = now;
    } catch (error) {
      console.error('Erro ao sincronizar localização com o backend:', error);
    }
  };

  // Função para iniciar o rastreamento de localização
  const startLocationTracking = async () => {
    try {
      // Limpar qualquer watcher anterior
      if (locationWatcherRef.current) {
        locationWatcherRef.current();
        locationWatcherRef.current = null;
      }

      // Iniciar o novo watcher
      const removeWatcher = await watchLocation((newLocation) => {
        console.log('LocationContext - Nova localização:', newLocation.coords);
        setLocation(newLocation);
        
        // Sincronizar com o backend quando a localização muda
        syncLocationWithBackend(newLocation);
      });

      // Armazenar a função para remover o watcher
      locationWatcherRef.current = removeWatcher;
    } catch (error) {
      console.error('Erro ao iniciar rastreamento de localização:', error);
      setErrorMsg('Falha ao rastrear localização');
    }
  };

  // Função para obter a localização inicial e começar a rastrear
  const initializeLocation = async () => {
    try {
      // Obter localização inicial
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      
      // Sincronizar a localização inicial com o backend
      syncLocationWithBackend(currentLocation);
      
      // Iniciar rastreamento contínuo
      await startLocationTracking();
    } catch (error) {
      console.error('Erro ao inicializar localização:', error);
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg('Falha ao acessar sua localização');
      }
    }
  };

  // Função para atualizar manualmente a localização
  const refreshLocation = async () => {
    try {
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      
      // Sincronizar a localização atualizada com o backend
      syncLocationWithBackend(currentLocation);
      
      // Reiniciar o rastreamento após a atualização manual
      await startLocationTracking();
    } catch (error) {
      console.error('Erro ao atualizar localização:', error);
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg('Falha ao atualizar sua localização');
      }
    }
  };

  // Inicializar localização quando o componente for montado
  useEffect(() => {
    initializeLocation();

    // Limpar o watcher quando o componente for desmontado
    return () => {
      if (locationWatcherRef.current) {
        locationWatcherRef.current();
      }
    };
  }, []);

  return (
    <LocationContext.Provider value={{ 
      location, 
      errorMsg, 
      refreshLocation,
      requestLocationPermission: requestPermission
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  return useContext(LocationContext);
};