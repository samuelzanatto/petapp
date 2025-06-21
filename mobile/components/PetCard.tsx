import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/theme';

type PetCardProps = {
  pet: {
    id: string;
    name: string;
    species: 'DOG' | 'CAT';
    primaryImage: string | null;
  };
};

const PetCard: React.FC<PetCardProps> = ({ pet }) => {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      <View style={styles.imageContainer}>
        <Image
          source={
            pet.primaryImage
              ? { uri: pet.primaryImage }
              : require('../assets/images/default-pet.png')
          }
          style={styles.image}
        />
      </View>
      <View style={styles.infoContainer}>
        <Text style={[styles.name, { color: colors.text }]}>{pet.name}</Text>
        <View style={styles.speciesContainer}>
          <Text style={[styles.species, { color: colors.textSecondary }]}>
            {pet.species === 'DOG' ? '🐶 Cachorro' : '🐱 Gato'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    margin: 10,
    padding: 0,
  },
  imageContainer: {
    width: '100%',
    height: 170,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  infoContainer: {
    padding: 15,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  speciesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  species: {
    fontSize: 14,
  },
});

export default PetCard;