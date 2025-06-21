import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Feather } from '@expo/vector-icons';
import TabBarButton from './TabBarButton';
import { useState, useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTheme } from '@/contexts/theme';

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { colors, isDark } = useTheme();
  
    const [dimensions, setDimensions] = useState({height: 20, width: 100});

    const buttonWidth = dimensions.width / state.routes.length;

    const onTabbarLayout = (e: LayoutChangeEvent) => {
        setDimensions({
            height: e.nativeEvent.layout.height,
            width: e.nativeEvent.layout.width,
        });
    };

    const tabPositionX = useSharedValue(0);

    // Atualizar a posição do background laranja quando o índice muda
    useEffect(() => {
        // Animar o background para a posição da aba ativa
        tabPositionX.value = withSpring(buttonWidth * state.index, { 
            mass: 0.8,
            damping: 20,
            stiffness: 100,
            overshootClamping: false,
            restDisplacementThreshold: 0.01,
            restSpeedThreshold: 2
        });
    }, [state.index, buttonWidth]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{translateX: tabPositionX.value}],
        };
    })

    return (
      <View onLayout={onTabbarLayout} style={[
        styles.tabbar,
        { 
          backgroundColor: colors.tabBackground,
          shadowColor: isDark ? colors.shadow : '#000',
        }
      ]}>
        <Animated.View style={[animatedStyle,{
            position: 'absolute',
            backgroundColor: colors.accent,
            borderRadius: 50,
            marginHorizontal: 7,
            height: dimensions.height - 14,
            width: buttonWidth - 14,
            // Efeito glow/neon
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 8,
            shadowOpacity: isDark ? 1 : 0.8,
            elevation: 8,
            // Propriedades adicionais para garantir que o glow seja visível
            zIndex: 0,
            overflow: 'visible',
        }]} />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            
            if (!isFocused && !event.defaultPrevented) {
              // Não precisamos animar aqui, o useEffect cuidará disso
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
              <TabBarButton 
                key={route.name}
                onPress={onPress}
                onLongPress={onLongPress}
                isFocused={isFocused}
                routeName={route.name}
                color={isFocused ? '#FFF' : colors.tabIconDefault}
                label={label}
              />
          );
        })}
      </View>
    );
}

const styles = StyleSheet.create({
    tabbar: {
        position: 'absolute',
        bottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 35,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 10,
        shadowOpacity: 0.1,
        elevation: 8,
        overflow: 'visible',
        zIndex: 1,
    },
})