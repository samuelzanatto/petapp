import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

type UserAvatarProps = {
  uri: string | null;
  size?: number;
};

const UserAvatar: React.FC<UserAvatarProps> = ({ uri, size = 50 }) => {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#e1e1e1',
    width: '100%',
    height: '100%',
  },
});

export default UserAvatar;