import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { ThemedText } from './ThemedText';

type LoadingProps = {
  message?: string;
  size?: 'small' | 'large';
};

export function Loading({ message, size = 'large' }: LoadingProps) {  
  // Escolha o arquivo de animação baseado no tema
  const animationFile = require('../assets/animations/loading.json');
  
  // Defina o tamanho baseado na prop
  const animationSize = size === 'large' ? 120 : 60;
  
  return (
    <View style={styles.container}>
      <LottieView
        source={animationFile}
        style={{ width: animationSize, height: animationSize }}
        autoPlay
        loop
      />
      {message && <ThemedText style={styles.message}>{message}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
});