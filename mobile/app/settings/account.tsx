import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Alert, 
  ActivityIndicator, 
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAuth } from '@/contexts/auth';
import { router, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/ThemedText';
import { TextInput, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { ThemedCard } from '@/components/ThemedCard';
import { api } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  
  // Configuração do tema para React Native Paper
  const paperTheme = isDark 
  ? {
      ...MD3DarkTheme,
      colors: {
        ...MD3DarkTheme.colors,
        primary: colors.accent,
        background: colors.card,
        surface: colors.card,
        onSurface: colors.text,
        outline: colors.border,
      }
    }
  : {
      ...MD3LightTheme,
      colors: {
        ...MD3LightTheme.colors,
        primary: colors.accent,
        background: colors.background,
        surface: colors.card,
        onSurface: colors.text,
        outline: colors.border,
      }
    };
  
  // Estados existentes...
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profileImage, setProfileImage] = useState<string | null>(user?.profileImage || null);
  
  // Contatos
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsappPhone, setWhatsappPhone] = useState(user?.whatsappPhone || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergencyPhone || '');
  const [emergencyContact, setEmergencyContact] = useState(user?.emergencyContact || '');
  
  // Endereço
  const [address, setAddress] = useState(user?.address || '');
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood || '');
  const [city, setCity] = useState(user?.city || '');
  const [state, setState] = useState(user?.state || '');
  const [zipCode, setZipCode] = useState(user?.zipCode || '');

  // Estado de expansão das seções
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    contact: true,
    address: false
  });

  // Funções existentes permanecem as mesmas
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    // Carregar dados atualizados do usuário quando a tela for montada
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setProfileImage(user.profileImage || null);
      setPhone(user.phone || '');
      setWhatsappPhone(user.whatsappPhone || '');
      setEmergencyPhone(user.emergencyPhone || '');
      setEmergencyContact(user.emergencyContact || '');
      setAddress(user.address || '');
      setNeighborhood(user.neighborhood || '');
      setCity(user.city || '');
      setState(user.state || '');
      setZipCode(user.zipCode || '');
    }
  }, [user]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Erro', 'Precisamos de permissão para acessar suas fotos');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const handleSave = async () => {
    // Código existente permanece o mesmo
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome não pode estar vazio.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Erro', 'Por favor, informe um email válido.');
      return;
    }

    setLoading(true);
    try {
      // Criar FormData para enviar dados e imagem
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      if (bio) formData.append('bio', bio);
      if (phone) formData.append('phone', phone);
      if (whatsappPhone) formData.append('whatsappPhone', whatsappPhone);
      if (emergencyPhone) formData.append('emergencyPhone', emergencyPhone);
      if (emergencyContact) formData.append('emergencyContact', emergencyContact);
      if (address) formData.append('address', address);
      if (neighborhood) formData.append('neighborhood', neighborhood);
      if (city) formData.append('city', city);
      if (state) formData.append('state', state);
      if (zipCode) formData.append('zipCode', zipCode);
      
      // Adicionar imagem se for nova (não inicia com http)
      if (profileImage && !profileImage.startsWith('http')) {
        const fileExtension = profileImage.split('.').pop() || 'jpg';
        formData.append('profileImage', {
          uri: profileImage,
          name: `profile_${Date.now()}.${fileExtension}`,
          type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
        } as any);
      }
      
      // Obter token diretamente do AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      
      // Fazer requisição diretamente com fetch
      const response = await fetch(`${api.BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
          // Não incluir Content-Type ao enviar FormData
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Erro ao atualizar perfil');
      }
      
      const updatedUser = await response.json();
      updateUser(updatedUser);
      Alert.alert('Sucesso', 'Suas informações foram atualizadas com sucesso');
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      Alert.alert('Erro', error.message || 'Não foi possível atualizar suas informações. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Estilos permanecem os mesmos
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textHeader,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    profileImageContainer: {
      alignSelf: 'center',
      marginBottom: 20,
      position: 'relative',
    },
    profileImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    placeholderImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cameraButton: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      backgroundColor: colors.accent,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 2,
    },
    sectionCard: {
      marginBottom: 15,
      borderRadius: 16,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textHeader,
    },
    sectionContent: {
      padding: 15,
      paddingTop: 5,
    },
    input: {
      marginBottom: 15,
      fontSize: 16,
      borderRadius: 8,
    },
    textArea: {
      minHeight: 100,
    },
    saveButton: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 50,
      borderRadius: 25,
      overflow: 'hidden',
      marginVertical: 20,
      marginBottom: 48,
      backgroundColor: colors.accent,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    saveButtonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    infoContainer: {
      flexDirection: 'row',
      padding: 12,
      borderRadius: 8,
      alignItems: 'flex-start',
      marginBottom: 15,
    },
    infoText: {
      fontSize: 12,
      marginLeft: 6,
      flex: 1,
      lineHeight: 18,
    }
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { 
        backgroundColor: colors.background,
      }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Editar Perfil
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Foto de perfil */}
          <View style={styles.profileImageContainer}>
            {profileImage ? (
              <Image 
                source={{ uri: profileImage }} 
                style={styles.profileImage} 
              />
            ) : (
              <View style={[styles.placeholderImage, { 
                backgroundColor: isDark ? colors.border : '#f0f0f0' 
              }]}>
                <Ionicons name="person" size={50} color={colors.textTertiary} />
              </View>
            )}
            <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
              <Ionicons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* Seção de informações pessoais */}
          <ThemedCard style={styles.sectionCard}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('personal')}
            >
              <ThemedText style={styles.sectionTitle}>
                Informações Pessoais
              </ThemedText>
              <Ionicons 
                name={expandedSections.personal ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.text} 
              />
            </TouchableOpacity>
            
            {expandedSections.personal && (
              <View style={styles.sectionContent}>
                <TextInput
                  label="Nome"
                  value={name}
                  onChangeText={setName}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                />
                
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  style={[styles.input]}
                  theme={paperTheme}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  mode="outlined"
                />
                
                <TextInput
                  label="Bio"
                  value={bio}
                  onChangeText={setBio}
                  style={[styles.input, styles.textArea]}
                  theme={paperTheme}
                  multiline
                  numberOfLines={4}
                  mode="outlined"
                />
              </View>
            )}
          </ThemedCard>
          
          {/* Seção de contatos */}
          <ThemedCard style={[styles.sectionCard, {
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4,
          }]}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('contact')}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.sectionTitle}>
                Contatos
              </ThemedText>
              <Ionicons 
                name={expandedSections.contact ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.text} 
              />
            </TouchableOpacity>
            
            {expandedSections.contact && (
              <View style={styles.sectionContent}>
                <TextInput
                  label="Telefone"
                  value={phone}
                  onChangeText={setPhone}
                  style={[styles.input]}
                  theme={paperTheme}
                  keyboardType="phone-pad"
                  mode="outlined"
                />
                
                <TextInput
                  label="WhatsApp"
                  value={whatsappPhone}
                  onChangeText={setWhatsappPhone}
                  style={[styles.input]}
                  theme={paperTheme}
                  keyboardType="phone-pad"
                  mode="outlined"
                />
                
                <TextInput
                  label="Telefone de Emergência"
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  style={[styles.input]}
                  theme={paperTheme}
                  keyboardType="phone-pad"
                  mode="outlined"
                />
                
                <TextInput
                  label="Nome do Contato de Emergência"
                  value={emergencyContact}
                  onChangeText={setEmergencyContact}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                />
                
                <View style={[styles.infoContainer, { 
                  borderColor: colors.accent,
                  borderWidth: isDark ? 1 : 0,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
                  <ThemedText style={[styles.infoText, { color: colors.textTertiary }]}>
                    Seus contatos serão visíveis apenas para pessoas que encontrarem seus pets perdidos.
                  </ThemedText>
                </View>
              </View>
            )}
          </ThemedCard>
          
          {/* Seção de endereço */}
          <ThemedCard style={[styles.sectionCard, {
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4,
          }]}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('address')}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.sectionTitle}>
                Endereço
              </ThemedText>
              <Ionicons 
                name={expandedSections.address ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.text} 
              />
            </TouchableOpacity>
            
            {expandedSections.address && (
              <View style={styles.sectionContent}>
                <TextInput
                  label="Endereço"
                  value={address}
                  onChangeText={setAddress}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                />
                
                <TextInput
                  label="Bairro"
                  value={neighborhood}
                  onChangeText={setNeighborhood}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                />
                
                <TextInput
                  label="Cidade"
                  value={city}
                  onChangeText={setCity}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                />
                
                <TextInput
                  label="Estado"
                  value={state}
                  onChangeText={setState}
                  style={[styles.input]}
                  theme={paperTheme}
                  mode="outlined"
                />
                
                <TextInput
                  label="CEP"
                  value={zipCode}
                  onChangeText={setZipCode}
                  style={[styles.input]}
                  theme={paperTheme}
                  keyboardType="number-pad"
                  mode="outlined"
                />
                
                <View style={[styles.infoContainer, { 
                  borderColor: colors.border,
                  borderWidth: isDark ? 1 : 0,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
                  <ThemedText style={[styles.infoText, { color: colors.textTertiary }]}>
                    Seu endereço completo não será visível para outros usuários. Ele é usado apenas para facilitar a busca por pets perdidos.
                  </ThemedText>
                </View>
              </View>
            )}
          </ThemedCard>
          
          {/* Botão de salvar */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.saveButtonText}>Salvar Alterações</ThemedText>
              )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}