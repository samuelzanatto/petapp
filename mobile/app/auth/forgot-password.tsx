import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  Image 
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { api } from '../../services/api';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AuthTheme from '@/components/AuthTheme';
import { useTheme } from '@/contexts/theme';
import { FontFamily } from '@/constants/Fonts';

export default function ForgotPassword() {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setEmailError('Por favor, insira seu email.');
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('Email inválido');
      return;
    }
    
    setEmailError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      Alert.alert(
        'Recuperação de Senha', 
        'Enviamos um email com instruções para recuperar sua senha.',
        [
          { 
            text: 'Voltar para Login', 
            onPress: () => router.push('/auth/login') 
          }
        ]
      );
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Erro', 
        'Não foi possível enviar o email de recuperação. Verifique seu email e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthTheme>
      <TouchableOpacity 
        style={[styles.backButton, {
          backgroundColor: isDark ? 'rgba(45, 45, 45, 0.85)' : 'rgba(255, 255, 255, 0.8)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.35 : 0.1,
          shadowRadius: 4,
          elevation: 3,
        }]} 
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : '#333333'} />
      </TouchableOpacity>
      
      <View style={styles.headerContainer}>
        <Image 
          source={require('@/assets/images/forgot-password.png')} 
          style={[styles.image, {
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.05)',
          }]}
          defaultSource={require('@/assets/images/forgot-password.png')}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#333333' }]}>Recuperar Senha</Text>
        <Text style={[styles.subtitle, { color: isDark ? '#AAAAAA' : '#666666' }]}>
          Informe seu email e enviaremos instruções para recuperar sua senha
        </Text>
      </View>

      <View style={[styles.formContainer, {
        backgroundColor: isDark ? 'rgba(45, 45, 45, 0.85)' : 'rgba(255, 255, 255, 1)',
        shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.35 : 0.2,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
      }]}>
        <TextInput
          label="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setEmailError('');
          }}
          style={[
            styles.input, 
            { 
              backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : '#F8F8F8',
            }
          ]}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          error={!!emailError}
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: colors.accent,
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
          left={<TextInput.Icon icon="email" color={isDark ? '#AAAAAA' : '#666666'} />}
          outlineColor={isDark ? '#444' : '#e0e0e0'}
          activeOutlineColor={colors.accent}
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleForgotPassword}
          disabled={loading}
        >
          <LinearGradient
            colors={loading ? ['#999', '#777'] : [colors.accent, '#FF8A43']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Enviar Instruções</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.helpContainer}>
          <Text style={[styles.helpText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
            Lembrou sua senha?
          </Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={[styles.helpLink, { color: colors.accent }]}>
              Voltar para Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </AuthTheme>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 36,
    left: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  image: {
    width: 120,
    height: 120,
    marginBottom: 20,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
    paddingHorizontal: 20,
    fontFamily: FontFamily.regular,
  },
  formContainer: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
  },
  input: {
    marginBottom: 16,
    borderRadius: 12,
    fontFamily: FontFamily.regular,
  },
  errorText: {
    color: '#FF4949',
    fontSize: 12,
    marginBottom: 16,
    marginLeft: 8,
    fontFamily: FontFamily.regular,
  },
  button: {
    height: 55,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  gradientButton: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
  helpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  helpText: {
    fontSize: 14,
    marginRight: 4,
    fontFamily: FontFamily.regular,
  },
  helpLink: {
    color: '#FF6B6B',
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
});