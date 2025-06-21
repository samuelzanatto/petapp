import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
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

export default function Register() {
  const { signUp } = useAuth();
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Validações
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Validação de email usando regex
  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Checar força da senha
  useEffect(() => {
    if (password) {
      let strength = 0;
      
      // Verificar comprimento
      if (password.length >= 8) strength += 25;
      
      // Verificar letras maiúsculas
      if (/[A-Z]/.test(password)) strength += 25;
      
      // Verificar números
      if (/[0-9]/.test(password)) strength += 25;
      
      // Verificar caracteres especiais
      if (/[^A-Za-z0-9]/.test(password)) strength += 25;
      
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(0);
    }
  }, [password]);

  const validateForm = () => {
    let isValid = true;
    
    // Validar nome
    if (!name.trim()) {
      setNameError('Nome é obrigatório');
      isValid = false;
    } else {
      setNameError('');
    }
    
    // Validar email
    if (!email.trim()) {
      setEmailError('Email é obrigatório');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Email inválido');
      isValid = false;
    } else {
      setEmailError('');
    }
    
    // Validar senha
    if (!password) {
      setPasswordError('Senha é obrigatória');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres');
      isValid = false;
    } else {
      setPasswordError('');
    }
    
    // Validar confirmação de senha
    if (password !== confirmPassword) {
      setConfirmPasswordError('As senhas não coincidem');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }
    
    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await signUp(name, email, password);
      router.push('/onboarding');
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        'Erro no Cadastro', 
        error.message || 'Não foi possível cadastrar. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 25) return 'Fraca';
    if (passwordStrength <= 50) return 'Média';
    if (passwordStrength <= 75) return 'Boa';
    return 'Forte';
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return '#E0E0E0';
    if (passwordStrength <= 25) return '#F44336';
    if (passwordStrength <= 50) return '#FFC107';
    if (passwordStrength <= 75) return '#4CAF50';
    return '#2196F3';
  };

  return (
    <AuthTheme>
      <TouchableOpacity 
        style={[styles.backButton, {
          backgroundColor: isDark ? 'rgba(45, 45, 45, 0.85)' : 'rgba(255, 255, 255, 1)',
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
          source={require('@/assets/images/register-icon.jpg')} 
          style={styles.logo}
          defaultSource={require('@/assets/images/register-icon.jpg')}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#333333' }]}>Criar Conta</Text>
        <Text style={[styles.subtitle, { color: isDark ? '#AAAAAA' : '#666666' }]}>
          Cadastre-se para encontrar e ajudar pets perdidos na sua região
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
          label="Nome Completo"
          value={name}
          onChangeText={setName}
          style={[
            styles.input, 
            { 
              backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : '#F8F8F8',
            }
          ]}
          mode="outlined"
          error={!!nameError}
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: colors.accent,
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
          left={<TextInput.Icon icon="account" color={isDark ? '#AAAAAA' : '#666666'} />}
          outlineColor={isDark ? '#444' : '#e0e0e0'}
          activeOutlineColor={colors.accent}
        />
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

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
          outlineColor={isDark ? '#444' : '#e0e0e0'}
          activeOutlineColor={colors.accent}
        />
        {passwordError ? (
          <Text style={styles.errorText}>{passwordError}</Text>
        ) : password ? (
          <View style={styles.passwordStrengthContainer}>
            <View style={styles.strengthBarContainer}>
              <LinearGradient
                colors={passwordStrength > 50 ? 
                  [colors.accent, '#FF8A43'] : 
                  [getPasswordStrengthColor(), getPasswordStrengthColor()]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.strengthBar, 
                  { width: `${passwordStrength}%` }
                ]} 
              />
            </View>
            <Text style={[
              styles.strengthText, 
              { color: getPasswordStrengthColor() }
            ]}>
              {getPasswordStrengthLabel()}
            </Text>
          </View>
        ) : null}

        <TextInput
          label="Confirmar Senha"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={[
            styles.input, 
            { 
              backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : '#F8F8F8',
            }
          ]}
          secureTextEntry={!showConfirmPassword}
          mode="outlined"
          error={!!confirmPasswordError}
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: colors.accent,
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            }
          }}
          left={<TextInput.Icon icon="lock-check" color={isDark ? '#AAAAAA' : '#666666'} />}
          right={
            <TextInput.Icon 
              icon={showConfirmPassword ? "eye-off" : "eye"} 
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              color={isDark ? '#AAAAAA' : '#666666'}
            />
          }
          outlineColor={isDark ? '#444' : '#e0e0e0'}
          activeOutlineColor={colors.accent}
        />
        {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
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
              <Text style={styles.buttonText}>Criar Conta</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={[styles.loginText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
            Já tem uma conta?
          </Text>
          <TouchableOpacity onPress={() => router.replace('/auth/login')}>
            <Text style={[styles.loginLink, { color: colors.accent }]}>Entrar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.termsContainer}>
          <Text style={[styles.termsText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
            Ao se cadastrar, você concorda com nossos{' '}
            <Text style={[styles.termsLink, { color: colors.accent }]}>Termos de Serviço</Text> e{' '}
            <Text style={[styles.termsLink, { color: colors.accent }]}>Política de Privacidade</Text>
          </Text>
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
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
    fontFamily: FontFamily.regular,
  },
  formContainer: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    width: '100%',
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
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: 8,
  },
  strengthBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  strengthBar: {
    height: 6,
    borderRadius: 3,
  },
  strengthText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
  },
  registerButton: {
    height: 55,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    marginRight: 4,
    fontSize: 14,
    fontFamily: FontFamily.regular,
  },
  loginLink: {
    color: '#FF6B6B',
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  termsContainer: {
    marginTop: 16,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: FontFamily.regular,
  },
  termsLink: {
    color: '#FF6B6B',
    fontFamily: FontFamily.medium,
  },
});