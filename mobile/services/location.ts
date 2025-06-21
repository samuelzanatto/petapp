import * as Location from 'expo-location';
import { LocationObject, LocationSubscription } from 'expo-location';

export const getCurrentLocation = async (): Promise<LocationObject> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    // Usar alta precisão para captar mudanças no emulador
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    console.log('Serviço de localização - coordenadas obtidas:', location.coords);
    return location;
  } catch (error) {
    console.error('Error getting location:', error);
    throw error;
  }
};

export const watchLocation = (callback: (location: LocationObject) => void): Promise<() => void> => {
  return new Promise<() => void>(async (resolve) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }
      
      // Configurações mais sensíveis para captar mudanças no emulador
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,        // Verificar a cada 3 segundos
          distanceInterval: 5,       // Ou quando mover 5 metros
          mayShowUserSettingsDialog: true
        },
        (location) => {
          console.log('Serviço de localização - nova posição:', location.coords);
          callback(location);
        }
      );
      
      // Retornar função para remover a assinatura
      resolve(() => {
        subscription.remove();
      });
    } catch (error) {
      console.error('Error watching location:', error);
      // Retornar função vazia se falhar
      resolve(() => {});
    }
  });
};