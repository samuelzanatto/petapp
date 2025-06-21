import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocation } from '@/hooks/useLocation';
import { useTheme } from '@/contexts/theme';

interface LocationUpdateButtonProps {
  style?: any;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  showText?: boolean;
  buttonSize?: 'small' | 'medium' | 'large';
}

export const LocationUpdateButton = ({
  style,
  onSuccess,
  onError,
  showText = true,
  buttonSize = 'medium'
}: LocationUpdateButtonProps) => {
  const [updating, setUpdating] = useState(false);
  const { updateLocation } = useLocation();
  const { isDark } = useTheme();

  // Tamanhos baseados no buttonSize
  const iconSize = buttonSize === 'small' ? 18 : buttonSize === 'medium' ? 24 : 30;
  const textSize = buttonSize === 'small' ? 12 : buttonSize === 'medium' ? 14 : 16;
  const paddingSize = buttonSize === 'small' ? 6 : buttonSize === 'medium' ? 10 : 14;

  const handleUpdateLocation = async () => {
    setUpdating(true);
    try {
      const success = await updateLocation();
      if (success) {
        Alert.alert(
          'Sucesso',
          'Localização atualizada com sucesso! Agora você receberá notificações de pets perdidos/encontrados na sua área.',
          [{ text: 'OK' }]
        );
        onSuccess?.();
      } else {
        throw new Error('Não foi possível atualizar a localização');
      }
    } catch (error) {
      console.error('Erro ao atualizar localização:', error);
      Alert.alert(
        'Erro',
        'Não foi possível atualizar sua localização. Verifique se o GPS está ativado e as permissões concedidas.',
        [{ text: 'OK' }]
      );
      onError?.(error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { 
          backgroundColor: isDark ? '#333' : '#fff',
          padding: paddingSize,
          borderColor: isDark ? '#555' : '#ddd'
        },
        style
      ]}
      onPress={handleUpdateLocation}
      disabled={updating}
    >
      {updating ? (
        <ActivityIndicator size="small" color={isDark ? '#fff' : '#333'} />
      ) : (
        <>
          <MaterialIcons
            name="my-location"
            size={iconSize}
            color={isDark ? '#fff' : '#333'}
          />
          {showText && (
            <Text
              style={[
                styles.text,
                { 
                  color: isDark ? '#fff' : '#333',
                  fontSize: textSize,
                  marginLeft: 8
                }
              ]}
            >
              Atualizar localização
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
  },
  text: {
    fontWeight: '500',
  }
});

export default LocationUpdateButton;