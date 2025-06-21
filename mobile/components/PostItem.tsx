import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

type PostItemProps = {
  post: {
    id: string;
    image: string;
    caption: string | null;
    user: {
      id: string;
      name: string;
      profileImage: string | null;
    };
    createdAt: string;
    likesCount: number;
    hasLiked: boolean;
  };
  onLike: (postId: string) => void;
};

const PostItem: React.FC<PostItemProps> = ({ post, onLike }) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => router.push(`/profile/${post.user.id}`)}
        >
          <Image
            source={
              post.user.profileImage
                ? { uri: post.user.profileImage }
                : require('../assets/images/default-avatar.png')
            }
            style={styles.avatar}
          />
          <Text style={styles.userName}>{post.user.name}</Text>
        </TouchableOpacity>
      </View>

      <Image source={{ uri: post.image }} style={styles.postImage} />

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => onLike(post.id)}>
          <Text style={styles.likeButton}>
            {post.hasLiked ? '❤️' : '🤍'} {post.likesCount} curtidas
          </Text>
        </TouchableOpacity>
        {post.caption && (
          <Text style={styles.caption}>
            <Text style={styles.userName}>{post.user.name}</Text> {post.caption}
          </Text>
        )}
        <Text style={styles.timestamp}>
          {new Date(post.createdAt).toLocaleDateString('pt-BR')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  postImage: {
    width: '100%',
    height: 400,
  },
  footer: {
    padding: 10,
  },
  likeButton: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  caption: {
    marginBottom: 5,
  },
  timestamp: {
    color: '#999',
    fontSize: 12,
  },
});

export default PostItem;