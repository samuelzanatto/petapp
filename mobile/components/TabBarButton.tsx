import { View, Text, Pressable, StyleSheet, GestureResponderEvent } from 'react-native'
import React, { useEffect } from 'react'
import { icon } from '@/constants/Icon';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Feather } from "@expo/vector-icons";
import { useTheme } from '@/contexts/theme';

// Tipo correto para os nomes dos ícones Feather
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const TabBarButton = ({ 
    onPress, 
    onLongPress, 
    isFocused, 
    routeName, 
    color, 
    label 
}: {
    onPress: (event: GestureResponderEvent) => void;
    onLongPress: (event: GestureResponderEvent) => void;
    isFocused: boolean;
    routeName: string;
    color: string;
    label: string;
}) => {
    const { colors, isDark } = useTheme();
    const scale = useSharedValue(0);

    useEffect(() => {
            scale.value = withSpring(typeof isFocused === 'boolean' ? (isFocused ? 1 : 0) : isFocused,
            { duration: 350 }
        );
    }, [scale, isFocused]);

    const animatedIconStyle = useAnimatedStyle(() => {
        const scaleValue = interpolate(scale.value, [0, 1], [1, 1.2]);

        const top = interpolate(scale.value, [0, 1], [0, 9]);

        return {
            transform: [{scale: scaleValue}],
            top
        }
    })

    const animatedTextStyle = useAnimatedStyle(() => {
      const opacity = interpolate(scale.value, [0, 1], [1, 0]);

      return {
        opacity
      }
    });

    // Effect de glow para o ícone quando estiver focado
    const glowStyle = isFocused ? {
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 10,
      shadowOpacity: isDark ? 1 : 0.8,
      elevation: 8,
    } : {};

    // Helper para renderizar o ícone correto
    const renderIcon = () => {
      // Se o ícone existe para a rota atual, use-o
      if (routeName in icon) {
        // Usamos as type assertion para dizer ao TypeScript que a string routeName existe no objeto icon
        const IconComponent = icon[routeName as keyof typeof icon];
        return IconComponent({ 
          color: isFocused ? colors.buttonText : colors.tabIconDefault 
        });
      }
      
      // Caso contrário, use um ícone padrão baseado no nome da rota
      let iconName: FeatherIconName = 'home'; // ícone padrão
      
      // Mapear nomes de rotas comuns para ícones apropriados
      switch(routeName.toLowerCase()) {
        case 'home':
          iconName = 'home';
          break;
        case 'chat':
          iconName = 'message-circle';
          break;
        case 'claims':
          iconName = 'target';
          break;
        case 'settings':
          iconName = 'settings';
          break;
        case 'notifications':
          iconName = 'bell';
          break;
        // Adicione outros casos conforme necessário
      }
      
      return <Feather name={iconName} size={24} color={isFocused ? colors.buttonText : colors.tabIconDefault} />;
    };

    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.tabbarItem}
      >
        <Animated.View style={[animatedIconStyle, glowStyle]}>
            {renderIcon()}
        </Animated.View>
        <Animated.Text style={[
          { 
            color: isFocused ? colors.accent : colors.tabIconDefault, 
            fontSize: 12 
          }, 
          animatedTextStyle
        ]}>
          {label}
        </Animated.Text>
      </Pressable>
    )
}   

export default TabBarButton;

const styles = StyleSheet.create({
    tabbarItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
    }
})