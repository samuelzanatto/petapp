import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconSymbolProps = {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  size?: number;
  color?: string;
};

export const IconSymbol: React.FC<IconSymbolProps> = ({ name, size = 24, color = '#000' }) => {
  return (
    <View>
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </View>
  );
};