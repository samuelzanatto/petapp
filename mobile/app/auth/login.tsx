import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Image,
  ActivityIndicator
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { useAuth } from '../../contexts/auth';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AuthTheme from '@/components/AuthTheme';
import { useTheme } from '@/contexts/theme';
import { FontFamily } from '@/constants/Fonts';

export default function Login() {
  const { signIn } = useAuth();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateForm = () => {
    let isValid = true;
    
    if (!email.trim()) {
      setEmailError('Email é obrigatório');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Email inválido');
      isValid = false;
    } else {
      setEmailError('');
    }
    
    if (!password) {
      setPasswordError('Senha é obrigatória');
      isValid = false;
    } else {
      setPasswordError('');
    }
    
    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { needsOnboarding } = await signIn(email, password);
      if (needsOnboarding) {
        router.push('/onboarding/pet-info');
      } else {
        router.push('/(tabs)');
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Erro no Login', 
        error.message || 'Não foi possível fazer login. Verifique suas credenciais e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthTheme>
      <View style={styles.logoContainer}>
        <Image 
          source={require('@/assets/images/login-logo.jpg')} 
          style={styles.logo}
          defaultSource={require('@/assets/images/login-logo.jpg')}
          resizeMode="contain"
        />
        <Text style={[styles.welcomeText, { color: isDark ? '#FFFFFF' : '#333333' }]}>
          Bem-vindo de volta!
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
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#333333' }]}>Login</Text>
        <Text style={[styles.subtitle, { color: isDark ? '#AAAAAA' : '#666666' }]}>
          Entre com suas credenciais para acessar sua conta
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
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
          outlineColor={isDark ? '#444' : '#e0e0e0'}
          activeOutlineColor={colors.accent}
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: colors.accent,
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
          left={<TextInput.Icon icon="email" color={isDark ? '#AAAAAA' : '#666666'} />}
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        
        <TextInput
          label="Senha"
          value={password}
          onChangeText={setPassword}
          style={[
            styles.input, 
            { 
              backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : '#F8F8F8',
            }
          ]}
          secureTextEntry={!showPassword}
          mode="outlined"
          error={!!passwordError}
          outlineColor={isDark ? '#444' : '#e0e0e0'}
          activeOutlineColor={colors.accent}
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: colors.accent,
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
          left={<TextInput.Icon icon="lock" color={isDark ? '#AAAAAA' : '#666666'} />}
          right={
            <TextInput.Icon 
              icon={showPassword ? "eye-off" : "eye"} 
              onPress={() => setShowPassword(!showPassword)}
              color={isDark ? '#AAAAAA' : '#666666'}
            />
          }
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        
        <TouchableOpacity 
          style={styles.forgotPasswordContainer} 
          onPress={() => router.push('/auth/forgot-password')}
        >
          <Text style={[styles.forgotPasswordText, { color: colors.accent }]}>
            Esqueceu a senha?
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <LinearGradient
            colors={loading ? ['#999', '#777'] : [colors.accent, '#FF8A43']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.registerContainer}>
        <Text style={[styles.registerText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
          Ainda não tem uma conta?
        </Text>
        <TouchableOpacity onPress={() => router.push('/auth/register')}>
          <Text style={[styles.registerLink, { color: colors.accent }]}>
            Cadastre-se
          </Text>
        </TouchableOpacity>
      </View>
    </AuthTheme>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
    borderRadius: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 32,
    padding: 24,
    borderRadius: 16,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    fontFamily: FontFamily.regular,
  },
  input: {
    marginBottom: 12,
    borderRadius: 12,
    fontFamily: FontFamily.regular,
  },
  errorText: {
    color: '#FF4949',
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 8,
    fontFamily: FontFamily.regular,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
  },
  loginButton: {
    height: 55,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  loginButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
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
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  registerText: {
    fontSize: 14,
    marginRight: 4,
    fontFamily: FontFamily.regular,
  },
  registerLink: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
});