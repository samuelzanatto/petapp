import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { useTheme } from '@/contexts/theme';
import CustomImagePicker from '@/components/ImagePicker';
import { createPetClaim } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/auth';
import { TextInput, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { Colors } from '@/constants/Colors';
import { Loading } from '@/components/Loading';

export default function PetClaimScreen() {
  const { colors, isDark } = useTheme();
  const themeColors = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const params = useLocalSearchParams();
  
  // Configuração do tema para React Native Paper
  const paperTheme = isDark 
  ? {
      ...MD3DarkTheme,
      colors: {
        ...MD3DarkTheme.colors,
        primary: themeColors.accent,
        background: themeColors.card,
        surface: themeColors.card,
        onSurface: themeColors.text,
        outline: themeColors.border,
      }
    }
  : {
      ...MD3LightTheme,
      colors: {
        ...MD3LightTheme.colors,
        primary: themeColors.accent,
        background: themeColors.background,
        surface: themeColors.card,
        onSurface: themeColors.text,
        outline: themeColors.border,
      }
    };
  // Recuperar parâmetros da rota com valores padrão para evitar undefined
  const petId = params.petId as string || '';
  const alertId = params.alertId as string || '';
  const petName = params.petName as string || 'Pet sem nome';
  const petImage = params.petImage as string || '';
  const routeAlertType = params.alertType as string || '';
    useEffect(() => {
    // Melhorar o log para entender exatamente o que está sendo recebido
    console.log('===============================');
    console.log('Parâmetros da tela de reivindicação:');
    console.log('alertId:', alertId);
    console.log('petId:', petId);
    console.log('petName:', petName);
    console.log('petImage:', petImage);
    console.log('alertType:', routeAlertType);
    console.log('Parâmetros completos:', JSON.stringify(params));
    console.log('===============================');
    
    // Validar alertType
    if (!routeAlertType) {
      console.warn('ATENÇÃO: alertType não foi fornecido nos parâmetros. Usando o padrão "FOUND"');
    } else if (!['FOUND', 'LOST'].includes(routeAlertType)) {
      console.error(`ERRO: alertType inválido: "${routeAlertType}". Deve ser "FOUND" ou "LOST"`);
    }
  }, []);
  
  // Estados para o formulário
  const [microchipNumber, setMicrochipNumber] = useState('');
  const [petFeatures, setPetFeatures] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [verificationImages, setVerificationImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Usar useEffect para logar apenas uma vez quando o componente montar
  useEffect(() => {
    console.log("Parâmetros recebidos:", { petId, alertId, petName });
  }, [petId, alertId, petName]);
  
  // Manipular seleção de imagens
  const handleImageSelected = (uri: string) => {
    setVerificationImages(prev => [...prev, uri]);
  };
  
  // Remover imagem
  const removeImage = (index: number) => {
    setVerificationImages(prev => prev.filter((_, i) => i !== index));
  };
  
  // Verificar se o usuário está autenticado
  const checkAuthentication = () => {
    if (!user) {
      Alert.alert(
        'Autenticação Necessária',
        'Você precisa estar logado para reivindicar um pet.',
        [
          { 
            text: 'Fazer Login', 
            onPress: () => router.push('/auth/login')
          },
          {
            text: 'Cancelar',
            style: 'cancel'
          }
        ]
      );
      return false;
    }
    return true;
  };
    // Validar dados do formulário
  const validateForm = () => {
    if (!alertId) {
      Alert.alert('Erro', 'ID do alerta não encontrado. Por favor, tente novamente.');
      return false;
    }
    
    if (!petFeatures.trim()) {
      Alert.alert('Informação necessária', 'Por favor, descreva características específicas do pet.');
      return false;
    }
    
    if (verificationImages.length === 0) {
      Alert.alert(
        'Imagens necessárias', 
        'Por favor, adicione pelo menos uma foto para comprovar a propriedade do pet.'
      );
      return false;
    }
    
    // Validar o tamanho do campo de características
    if (petFeatures.trim().length < 10) {
      Alert.alert(
        'Informação insuficiente', 
        'Por favor, forneça uma descrição mais detalhada das características do pet.'
      );
      return false;
    }
    
    return true;
  };
  // Enviar reivindicação
  const submitClaim = async () => {
    // Verificar autenticação
    if (!checkAuthentication()) {
      return;
    }
    
    // Validar formulário
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      console.log("Enviando reivindicação para o alerta:", alertId);
      
      // Usar o tipo de alerta passado pela rota ou definir como FOUND por padrão
      // FOUND significa que estamos reivindicando um pet que alguém encontrou
      const alertType = routeAlertType || 'FOUND';
      console.log("Tipo de alerta determinado:", alertType);
      
      // Verificação adicional do tipo de alerta
      if (!['FOUND', 'LOST'].includes(alertType)) {
        throw new Error(`Tipo de alerta inválido: "${alertType}". Deve ser "FOUND" ou "LOST"`);
      }
      
      // Montar os detalhes de verificação
      const verificationDetails = {
        microchipNumber: microchipNumber.trim(),
        petFeatures: petFeatures.trim(),
        additionalInfo: additionalInfo.trim()
      };
      
      // Chamar a API para criar a reivindicação
      const response = await createPetClaim(alertId, alertType, verificationDetails, verificationImages);
      
      setLoading(false);
      
      console.log("Resposta da reivindicação:", response);
      
      // Verificar se a resposta tem uma propriedade claim ou message
      if (response && (response.claim || response.message)) {
        // Mostrar confirmação
        Alert.alert(
          'Reivindicação enviada', 
          'Sua reivindicação foi enviada com sucesso e está em análise. Você será notificado quando houver uma atualização.',
          [
            { 
              text: 'Ver minhas reivindicações', 
              onPress: () => {
                // Navegar diretamente para a tela de reivindicações
                router.replace('/claims');
              }
            },
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        throw new Error('Resposta inválida do servidor');
      }    } catch (error: any) {
      setLoading(false);
      console.error('Erro ao enviar reivindicação:', error);
      
      // Tratamento de erros mais específico
      let errorMessage = 'Ocorreu um erro ao enviar sua reivindicação. Por favor, tente novamente.';
      
      if (error.message) {
        // Mensagens de erro específicas
        if (error.message.includes('já tem uma reivindicação pendente')) {
          errorMessage = 'Você já tem uma reivindicação pendente para este pet.';
        } else if (error.message.includes('Usuário não autenticado')) {
          errorMessage = 'Você precisa estar logado para enviar uma reivindicação.';
          // Redirecionar para a tela de login
          router.push('/auth/login');
          return;
        } else if (error.message.includes('own pet')) {
          errorMessage = 'Você não pode reivindicar seu próprio pet.';
        } else {
          // Usar a mensagem de erro da API se disponível
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Erro', errorMessage);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
      paddingTop: 36,
      paddingBottom: 50,
    },
    headerSection: {
      padding: 15,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    subTitle: {
      fontSize: 14,
      lineHeight: 20,
    },
    petPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
    },
    petImage: {
      width: 70,
      height: 70,
      borderRadius: 10,
      marginRight: 15,
    },
    petInfo: {
      flex: 1,
    },
    petName: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    petSubtitle: {
      fontSize: 12,
      opacity: 0.7,
    },
    formSection: {
      width: '100%',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15,
    },
    formGroup: {
      marginBottom: 20,
      width: '100%',
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 8,
    },
    imageHelper: {
      fontSize: 12,
      opacity: 0.7,
      marginBottom: 10,
    },
    imagesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    imagePicker: {
      margin: 5,
    },
    addImageButton: {
      width: 90,
      height: 90,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePreviewContainer: {
      margin: 5,
      position: 'relative',
    },
    imagePreview: {
      width: 90,
      height: 90,
      borderRadius: 10,
    },
    removeImageButton: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: 'white',
      borderRadius: 12,
    },
    actionSection: {
      width: '100%',
    },
    securityNote: {
      fontSize: 12,
      opacity: 0.7,
      marginBottom: 20,
      textAlign: 'center',
    },
    submitButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 25,
      backgroundColor: colors.accent,
      overflow: 'hidden',
      marginBottom: 15,
    },
    submitButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    cancelButton: {
      paddingVertical: 14,
      borderRadius: 25,
      alignItems: 'center',
      borderWidth: 1,
    },
    cancelButtonText: {
      fontSize: 16,
    }
  });

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Reivindicar Pet',
          headerStyle: {
            backgroundColor: isDark ? themeColors.card : 'rgba(255,255,255,0.95)',
          },
          headerShadowVisible: false,
          headerTitleStyle: { 
            fontWeight: 'bold',
            color: colors.text
          }
        }}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >          <ThemedCard style={{
            borderRadius: 16,
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4,
            padding: 16,
            marginBottom: 20
          }}>
            <View style={styles.headerSection}>
              <ThemedText style={styles.title}>Reivindicar Pet</ThemedText>
              <ThemedText style={styles.subTitle}>
                Para garantir que apenas o verdadeiro dono tenha acesso ao pet encontrado, 
                por favor forneça informações que comprovem que este pet é seu.
              </ThemedText>
            </View>
          </ThemedCard>        
          <ThemedCard style={{
            borderRadius: 16,
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4,
            marginBottom: 20,
            backgroundColor: isDark ? themeColors.card : themeColors.card
          }}>
          <View style={styles.petPreview}>
            <Image 
              source={petImage ? { uri: petImage } : require('@/assets/images/default-pet.png')} 
              style={styles.petImage}
            />
            <View style={styles.petInfo}>
              <ThemedText style={[styles.petName, {color: themeColors.text}]}>{petName}</ThemedText>
              <ThemedText style={[styles.petSubtitle, {color: themeColors.textTertiary}]}>ID: {petId}</ThemedText>
            </View>
          </View>
        </ThemedCard>
          <ThemedCard style={{
            borderRadius: 16,
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4,
            padding: 16,
            marginBottom: 20
          }}>
          <View style={styles.formSection}>
            <ThemedText style={[styles.sectionTitle, {
              borderBottomWidth: 1,
              borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              paddingBottom: 8
            }]}>Informações de Verificação</ThemedText>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Número do Microchip (se houver)</ThemedText>
              <TextInput
                mode="outlined"
                outlineColor={themeColors.border}
                activeOutlineColor={themeColors.accent}
                style={{ backgroundColor: themeColors.input }}
                placeholder="Digite o número do microchip"
                placeholderTextColor={themeColors.textTertiary}
                value={microchipNumber}
                onChangeText={setMicrochipNumber}
                theme={paperTheme}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Características específicas do pet *</ThemedText>
              <TextInput
                mode="outlined"
                outlineColor={themeColors.border}
                activeOutlineColor={themeColors.accent}
                style={{ backgroundColor: themeColors.input, minHeight: 100, paddingTop: 18 }}
                placeholder="Descreva características que só o dono conheceria (marcas específicas, comportamentos, preferências, etc.)"
                placeholderTextColor={themeColors.textTertiary}
                value={petFeatures}
                onChangeText={setPetFeatures}
                multiline
                numberOfLines={4}
                theme={paperTheme}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Informações adicionais</ThemedText>
              <TextInput
                mode="outlined"
                outlineColor={themeColors.border}
                activeOutlineColor={themeColors.accent}
                style={{ backgroundColor: themeColors.input, minHeight: 100, paddingTop: 26 }}
                placeholder="Qualquer outra informação que possa ajudar a comprovar que este pet é seu"
                placeholderTextColor={themeColors.textTertiary}
                value={additionalInfo}
                onChangeText={setAdditionalInfo}
                multiline
                numberOfLines={4}
                theme={paperTheme}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Fotos para comprovação *</ThemedText>
              <ThemedText style={styles.imageHelper}>
                Adicione fotos antigas do pet com você, documentos de propriedade, 
                receitas veterinárias ou outras evidências que comprovem a propriedade.
              </ThemedText>
                <View style={styles.imagesContainer}>
                {verificationImages.map((uri, index) => (
                  <View key={index} style={[styles.imagePreviewContainer, {
                    shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.25 : 0.1,
                    shadowRadius: 4,
                    elevation: 3
                  }]}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <TouchableOpacity 
                      style={styles.removeImageButton} 
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color={themeColors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                
                <CustomImagePicker 
                  onImageSelected={handleImageSelected}
                  style={styles.imagePicker}
                >
                  <View style={[styles.addImageButton, { 
                    borderColor: themeColors.border,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
                  }]}>
                    <Ionicons name="add" size={30} color={themeColors.accent} />
                  </View>
                </CustomImagePicker>
              </View>
            </View>
          </View>
        </ThemedCard>
          <ThemedCard style={{
            borderRadius: 16,
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4,
            padding: 16,
            marginBottom: 20
          }}>
          <View style={styles.actionSection}>            
            <ThemedText style={[styles.securityNote, {
              color: themeColors.textTertiary,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
              padding: 10,
              borderRadius: 8,
              marginBottom: 20
            }]}>
              As informações fornecidas serão usadas apenas para verificar sua propriedade sobre o pet.
              Sua privacidade é importante para nós.
            </ThemedText>
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={submitClaim}
              disabled={loading}
            >              
              {loading ? (
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                  <ActivityIndicator size="small" color="#fff" />
                  <ThemedText style={[styles.submitButtonText, {marginLeft: 8}]}>Enviando...</ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.submitButtonText}>Enviar Reivindicação</ThemedText>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.cancelButton, { 
                borderColor: themeColors.border,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
              }]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <ThemedText style={[styles.cancelButtonText, {color: themeColors.textTertiary}]}>Cancelar</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedCard>
      </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

