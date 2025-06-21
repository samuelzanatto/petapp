import React from 'react';
import { View, StyleSheet } from 'react-native';

const TabBarBackground = () => {
  return (
    <View style={styles.container} />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Adjust the color and opacity as needed
  },
});

export default TabBarBackground;