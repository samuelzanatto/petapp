import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Modal,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal as PaperModal, Portal, Provider, Button } from 'react-native-paper';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import UserAvatar from '@/components/UserAvatar';
import { CustomAlert } from '@/components/CustomAlert';
import { useTheme } from '@/contexts/theme';
import { useAuth } from '@/contexts/auth';
import { getClaimDetails, updateClaimStatus } from '@/services/api';
import { API_URL } from '@/constants/Config';

// Função utilitária para formatar URLs de imagens
const getFullImageUrl = (imagePath: string | null): string | null => {
  if (!imagePath) return null;
  
  // Se já for uma URL completa, retorna a mesma
  if (imagePath.startsWith('http')) return imagePath;
  
  // Remove "api" do final da URL base se estiver presente
  const baseUrl = API_URL.endsWith('/api') 
    ? API_URL.substring(0, API_URL.length - 4) 
    : API_URL;
  
  // Normaliza barras no caminho
  const normalizedPath = imagePath.replace(/\\/g, '/');
  
  return `${baseUrl}/${normalizedPath}`;
};

// Tipos para a reivindicação
type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

// Mapeamento para mensagens de sucesso
const successMessages: Record<ClaimStatus, string> = {
  PENDING: 'Status atualizado para pendente!',
  APPROVED: 'Reivindicação aprovada com sucesso!',
  REJECTED: 'Reivindicação rejeitada com sucesso!',
  CANCELLED: 'Reivindicação cancelada com sucesso!',
  COMPLETED: 'Reivindicação concluída com sucesso!'
};

type Claim = {
  id: string;
  status: ClaimStatus;
  createdAt: string;
  updatedAt: string;
  claimReason: string;
  additionalInformation: string | null;
  verificationImages?: string[];
  verificationDetails?: {
    microchipNumber?: string;
    petFeatures?: string;
    additionalInfo?: string;
  };
  statusHistory: Array<{
    status: ClaimStatus;
    timestamp: string;
    comment: string | null;
  }>;
  claimant: {
    id: string;
    name: string;
    profileImage: string | null;
    email: string;
    phone: string | null;
  };
  alert: {
    id: string;
    alertType: 'LOST' | 'FOUND';
    image?: string | null; // Adicionando a propriedade de imagem
    pet: {
      id: string;
      name: string;
      primaryImage: string;
      species: 'DOG' | 'CAT';
      breed: string | null;
      gender: 'MALE' | 'FEMALE' | null;
      color: string | null;
      size: 'SMALL' | 'MEDIUM' | 'LARGE' | null;
      description: string | null;
    }
    user: {
      id: string;
      name: string;
      profileImage: string | null;
      email: string;
      phone: string | null;
    }
  };
};

export default function ClaimDetailScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth(); // Usar o hook useAuth para obter o usuário logado
  const params = useLocalSearchParams();
  const claimId = params.id as string;
  
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isClaimant, setIsClaimant] = useState(false);
  const [commentVisible, setCommentVisible] = useState(false);
  const [comment, setComment] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'cancel' | 'complete'>('approve');
  const [submitting, setSubmitting] = useState(false);
  
  // Estado para controlar a visualização de imagem em tela cheia
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

  const [chatAlertVisible, setChatAlertVisible] = useState(false);
  const [chatAlertMessage, setChatAlertMessage] = useState('');
  
  const loadClaimDetails = useCallback(async () => {
    try {
      setLoading(true);
      const claimData = await getClaimDetails(claimId);
      
      console.log('Dados originais da reivindicação:', JSON.stringify(claimData, null, 2));
        // Formatar os dados recebidos para o formato esperado pelo componente
      const formattedClaim = {
        ...claimData,
        // Extrair dados do alerta e do pet
        alert: {
          // Use alertDetails se disponível, ou crie um objeto vazio para evitar erros
          ...(claimData.alertDetails || {}),
          // Usar o tipo de alerta correto (FOUND ou LOST)
          alertType: claimData.alertType,
          // Adicionar URL base às imagens do alerta - buscando da fonte correta
          image: getFullImageUrl(
            claimData.alertType === 'FOUND' 
              ? claimData.foundAlert?.image 
              : claimData.lostAlert?.pet?.primaryImage
          ),
          pet: {
            // Para alertas LOST, o pet está diretamente no lostAlert
            // Para alertas FOUND, precisamos criar uma estrutura similar
            ...(claimData.alertType === 'LOST' 
              ? claimData.lostAlert?.pet || {} 
              : {
                  id: claimData.foundAlertId || '',
                  name: claimData.foundAlert?.species === 'DOG' ? 'Cachorro encontrado' : 'Gato encontrado',
                  species: claimData.foundAlert?.species || 'DOG',
                  primaryImage: claimData.foundAlert?.image || null,
                }
            ),
            // Garantir que a URL da imagem do pet está formatada
            primaryImage: getFullImageUrl(
              claimData.alertType === 'LOST' 
                ? claimData.lostAlert?.pet?.primaryImage 
                : claimData.foundAlert?.image
            )
          },
          // Garantir que temos informações do usuário que criou o alerta
          user: {
            ...(claimData.alertType === 'FOUND' 
              ? claimData.foundAlert?.user || {} 
              : claimData.lostAlert?.user || {}
            ),
            // Formatar URL da imagem de perfil
            profileImage: getFullImageUrl(
              claimData.alertType === 'FOUND'
                ? claimData.foundAlert?.user?.profileImage
                : claimData.lostAlert?.user?.profileImage
            )
          }
        },
        // Extrair dados adicionais
        claimReason: claimData.verificationDetails?.petFeatures || 'Sem informações',
        additionalInformation: claimData.verificationDetails?.additionalInfo || null,        // Formatar URLs das imagens de verificação
        verificationImages: (claimData.verificationImages || []).map((img: string) => getFullImageUrl(img) || ''),
        // Inicializar histórico de status se não existir
        statusHistory: claimData.statusHistory || []
      };

      console.log('Dados formatados da reivindicação:', formattedClaim);
      
      setClaim(formattedClaim);
      
      // Determinar se o usuário é dono ou solicitante
      const userId = user?.id;
        // Verificar permissões - com verificação segura de existência do objeto alert
      // Obter o userId do alerta da forma correta, baseado no tipo de alerta
      const alertUserId = claimData.alertType === 'FOUND' 
        ? claimData.foundAlert?.user?.id 
        : claimData.lostAlert?.user?.id;
        
      const isOwnerValue = alertUserId === userId || (claimData.alertDetails && claimData.alertDetails.userId === userId);
      const isClaimantValue = claimData.claimantId === userId;
      
      console.log('Permissões:', { userId, alertUserId, isOwner: isOwnerValue, isClaimant: isClaimantValue });
      
      setIsOwner(isOwnerValue);
      setIsClaimant(isClaimantValue);
      
    } catch (error) {
      console.error('Erro ao carregar detalhes da reivindicação:', error);
      Alert.alert(
        'Erro',
        'Não foi possível carregar os detalhes desta reivindicação.',
        [{ text: 'Voltar', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  }, [claimId, user?.id]);
  
  useEffect(() => {
    loadClaimDetails();
  }, [loadClaimDetails]);
  
  const handleUpdateStatus = async (newStatus: ClaimStatus) => {
    try {
      setSubmitting(true);
      
      // Se não houver comentário, envie uma string vazia em vez de null
      await updateClaimStatus(claimId, newStatus, comment || '');
      
      // Atualizar os detalhes localmente após o sucesso
      await loadClaimDetails();
      
      // Fechar o modal se estiver aberto
      setCommentVisible(false);
      setComment('');
      
      // Exibir mensagem de sucesso
      Alert.alert('Sucesso', successMessages[newStatus]);
      
      // Se for uma conclusão ou cancelamento, voltar para a lista de reivindicações
      if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
        // Corrigido: usar apenas '/claims' em vez de '/claims/index'
        router.replace('/claims');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status da reivindicação.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const openCommentModal = (action: 'approve' | 'reject' | 'cancel' | 'complete') => {
    setActionType(action);
    setCommentVisible(true);
  };
  
  const confirmAction = () => {
    const statusMap = {
      approve: 'APPROVED' as ClaimStatus,
      reject: 'REJECTED' as ClaimStatus,
      cancel: 'CANCELLED' as ClaimStatus,
      complete: 'COMPLETED' as ClaimStatus
    };
    
    handleUpdateStatus(statusMap[actionType]);
  };
    const getStatusColor = (status: ClaimStatus) => {
    switch (status) {
      case 'PENDING': return colors.accent; // Laranja primário 
      case 'APPROVED': return '#4CAF50'; // Verde
      case 'REJECTED': return '#F44336'; // Vermelho
      case 'COMPLETED': return '#2196F3'; // Azul
      case 'CANCELLED': return '#9E9E9E'; // Cinza
      default: return '#9E9E9E';
    }
  };
  
  const getStatusText = (status: ClaimStatus) => {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'APPROVED': return 'Aprovado';
      case 'REJECTED': return 'Rejeitado';
      case 'COMPLETED': return 'Concluído';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (loading) {
    return (      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <ThemedText style={styles.loadingText}>
            Carregando detalhes da reivindicação...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!claim) {
    return (      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.accent} />
          <ThemedText style={styles.errorText}>
            Reivindicação não encontrada ou excluída.
          </ThemedText>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.accent }]}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.backButtonText}>Voltar</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <Provider>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Modal para visualização de imagem em tela cheia */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={fullscreenVisible}
          onRequestClose={() => setFullscreenVisible(false)}
        >
          <View style={styles.fullscreenContainer}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setFullscreenVisible(false)}
            >
              <Ionicons name="close-circle" size={36} color="#fff" />
            </TouchableOpacity>
            
            {fullscreenImage && (
              <Image
                source={{ uri: fullscreenImage }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
        
        <Stack.Screen
          options={{
            title: 'Detalhes da Reivindicação',
            headerTitleStyle: { fontWeight: 'bold' },
            headerShadowVisible: false
          }}
        />
        
        <ScrollView 
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Status da reivindicação */}
          <View 
            style={[
              styles.statusCard, 
              { backgroundColor: getStatusColor(claim.status) }
            ]}
          >
            <View style={styles.statusCardContent}>
              <Ionicons 
                name={
                  claim.status === 'PENDING' ? 'time-outline' :
                  claim.status === 'APPROVED' ? 'checkmark-circle-outline' :
                  claim.status === 'REJECTED' ? 'close-circle-outline' :
                  claim.status === 'COMPLETED' ? 'checkmark-done-circle-outline' : 'ban-outline'
                } 
                size={28} 
                color="white" 
              />
              <View style={styles.statusTextContainer}>
                <ThemedText style={styles.statusTitle}>
                  Status: {getStatusText(claim.status)}
                </ThemedText>
                <ThemedText style={styles.statusDate}>
                  Atualizado em {formatDate(claim.updatedAt)}
                </ThemedText>
              </View>
            </View>
          </View>
            {/* Informações do Pet */}
          <ThemedCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="paw-outline" size={22} color={colors.accent} />
              <ThemedText style={styles.sectionTitle}>Informações do Pet</ThemedText>
            </View>
              <View style={styles.petInfoContainer}>
              {claim.alert && claim.alert.pet && claim.alert.pet.primaryImage ? (
                <TouchableOpacity 
                  onPress={() => {
                    setFullscreenImage(claim.alert.pet.primaryImage || null);
                    setFullscreenVisible(true);
                  }}
                >
                  <Image 
                    source={{ uri: claim.alert.pet.primaryImage }}
                    style={styles.petImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : claim.alert && claim.alert.image ? (
                <TouchableOpacity 
                  onPress={() => {
                    setFullscreenImage(claim.alert.image || null);
                    setFullscreenVisible(true);
                  }}
                >
                  <Image 
                    source={{ uri: claim.alert.image }}
                    style={styles.petImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <View style={[styles.petImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="image-outline" size={60} color="#cccccc" />
                </View>
              )}
              
              <View style={styles.petDetails}>
                <ThemedText style={styles.petName}>{claim.alert && claim.alert.pet ? claim.alert.pet.name : 'Nome indisponível'}</ThemedText>
                <ThemedText style={styles.petInfo}>
                  {claim.alert && claim.alert.pet ? 
                    (claim.alert.pet.species === 'DOG' ? '🐶 Cachorro' : '🐱 Gato') : ''}
                  {claim.alert && claim.alert.pet && claim.alert.pet.breed ? ` • ${claim.alert.pet.breed}` : ''}
                </ThemedText>
                
                <View style={styles.petAttributesRow}>
                  {claim.alert && claim.alert.pet && claim.alert.pet.gender && (                    <View style={[styles.petAttribute, { backgroundColor: `rgba(${parseInt(colors.accent.substring(1, 3), 16)},${parseInt(colors.accent.substring(3, 5), 16)},${parseInt(colors.accent.substring(5, 7), 16)},0.1)` }]}>
                      <Ionicons 
                        name={claim.alert.pet.gender === 'MALE' ? 'male-outline' : 'female-outline'} 
                        size={16} 
                        color={colors.accent} 
                      />
                      <ThemedText style={styles.petAttributeText}>
                        {claim.alert.pet.gender === 'MALE' ? 'Macho' : 'Fêmea'}
                      </ThemedText>
                    </View>
                  )}
                    {claim.alert && claim.alert.pet && claim.alert.pet.size && (
                    <View style={[styles.petAttribute, { backgroundColor: `rgba(${parseInt(colors.accent.substring(1, 3), 16)},${parseInt(colors.accent.substring(3, 5), 16)},${parseInt(colors.accent.substring(5, 7), 16)},0.1)` }]}>
                      <Ionicons name="resize-outline" size={16} color={colors.accent} />
                      <ThemedText style={styles.petAttributeText}>
                        {claim.alert.pet.size === 'SMALL' ? 'Pequeno' :
                         claim.alert.pet.size === 'MEDIUM' ? 'Médio' : 'Grande'}
                      </ThemedText>
                    </View>
                  )}
                    {claim.alert && claim.alert.pet && claim.alert.pet.color && (
                    <View style={[styles.petAttribute, { backgroundColor: `rgba(${parseInt(colors.accent.substring(1, 3), 16)},${parseInt(colors.accent.substring(3, 5), 16)},${parseInt(colors.accent.substring(5, 7), 16)},0.1)` }]}>
                      <Ionicons name="color-palette-outline" size={16} color={colors.accent} />
                      <ThemedText style={styles.petAttributeText}>
                        {claim.alert.pet.color}
                      </ThemedText>
                    </View>
                  )}
                </View>
                
                {claim.alert && claim.alert.pet && claim.alert.pet.description && (
                  <ThemedText style={styles.petDescription}>
                    "{claim.alert.pet.description}"
                  </ThemedText>
                )}
              </View>
            </View>
          </ThemedCard>
            {/* Informações do Solicitante */}
          <ThemedCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={22} color={colors.accent} />
              <ThemedText style={styles.sectionTitle}>Solicitante</ThemedText>
            </View>
            
            <View style={styles.userInfoContainer}>
              {claim.claimant ? (
                <UserAvatar 
                  uri={claim.claimant.profileImage}
                  size={60}
                />
              ) : (
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="person-outline" size={30} color="#cccccc" />
                </View>
              )}
              
              <View style={styles.userInfo}>
                <ThemedText style={styles.userName}>{claim.claimant ? claim.claimant.name : 'Nome indisponível'}</ThemedText>
                  <View style={styles.contactInfo}>
                  {claim.claimant && claim.claimant.email && (
                    <TouchableOpacity style={styles.contactButton}>
                      <Ionicons name="mail-outline" size={16} color={colors.accent} />
                      <ThemedText style={styles.contactText}>{claim.claimant.email}</ThemedText>
                    </TouchableOpacity>
                  )}
                  
                  {claim.claimant && claim.claimant.phone && (
                    <TouchableOpacity style={styles.contactButton}>
                      <Ionicons name="call-outline" size={16} color={colors.accent} />
                      <ThemedText style={styles.contactText}>{claim.claimant.phone}</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </ThemedCard>
            {/* Informações do Dono do Alerta */}
          <ThemedCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="megaphone-outline" size={22} color={colors.accent} />
              <ThemedText style={styles.sectionTitle}>
                {claim.alert.alertType === 'LOST' ? 'Dono do Pet' : 'Quem encontrou o Pet'}
              </ThemedText>
            </View>
            
            <View style={styles.userInfoContainer}>
              {claim.alert && claim.alert.user ? (
                <UserAvatar 
                  uri={claim.alert.user.profileImage}
                  size={60}
                />
              ) : (
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="person-outline" size={30} color="#cccccc" />
                </View>
              )}
              
              <View style={styles.userInfo}>
                <ThemedText style={styles.userName}>
                  {claim.alert && claim.alert.user ? claim.alert.user.name : 'Nome indisponível'}
                </ThemedText>
                  <View style={styles.contactInfo}>
                  {claim.alert && claim.alert.user && claim.alert.user.email && (
                    <TouchableOpacity style={styles.contactButton}>
                      <Ionicons name="mail-outline" size={16} color={colors.accent} />
                      <ThemedText style={styles.contactText}>{claim.alert.user.email}</ThemedText>
                    </TouchableOpacity>
                  )}
                  
                  {claim.alert && claim.alert.user && claim.alert.user.phone && (
                    <TouchableOpacity style={styles.contactButton}>
                      <Ionicons name="call-outline" size={16} color={colors.accent} />
                      <ThemedText style={styles.contactText}>{claim.alert.user.phone}</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>            {/* Botão de chat - Mostrar apenas se a reivindicação for APPROVED */}
            {claim.status === 'APPROVED' && (
              <TouchableOpacity 
                style={styles.chatButton}
                onPress={() => {
                  try {
                    // Se o usuário for o dono do alerta, o chat será com o solicitante
                    // Se o usuário for o solicitante, o chat será com o dono do alerta
                    const targetUserId = isOwner ? claim.claimant.id : claim.alert.user.id;
                    
                    // Usar o CustomAlert caso não seja possível iniciar o chat
                    router.push(`/chat/direct/${targetUserId}`);
                  } catch (error) {
                    console.error('Erro ao iniciar chat:', error);
                    setChatAlertMessage('Ocorreu um problema ao iniciar o chat. Tente novamente mais tarde.');
                    setChatAlertVisible(true);
                  }
                }}
                activeOpacity={0.7}
              >                <LinearGradient
                  colors={[colors.primary, colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.chatButtonGradient}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="white" />
                  <ThemedText style={styles.chatButtonText}>
                    Iniciar Conversa
                  </ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </ThemedCard>
            {/* Detalhes da Reivindicação */}
          <ThemedCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={22} color={colors.accent} />
              <ThemedText style={styles.sectionTitle}>Detalhes da Reivindicação</ThemedText>
            </View>
            
            <View style={styles.claimDetailsContainer}>
              <View style={styles.claimDetailItem}>
                <ThemedText style={styles.claimDetailLabel}>Data da solicitação:</ThemedText>
                <ThemedText style={styles.claimDetailValue}>{formatDate(claim.createdAt)}</ThemedText>
              </View>
              
              {claim.verificationDetails?.microchipNumber && (
                <View style={styles.claimDetailItem}>
                  <ThemedText style={styles.claimDetailLabel}>Número do Microchip:</ThemedText>
                  <ThemedText style={styles.claimDetailValue}>{claim.verificationDetails.microchipNumber}</ThemedText>
                </View>
              )}
              
              <View style={styles.claimDetailItem}>
                <ThemedText style={styles.claimDetailLabel}>Características específicas do pet:</ThemedText>
                <ThemedText style={styles.claimDetailValue}>{claim.claimReason}</ThemedText>
              </View>
              
              {claim.additionalInformation && (
                <View style={styles.claimDetailItem}>
                  <ThemedText style={styles.claimDetailLabel}>Informações adicionais:</ThemedText>
                  <ThemedText style={styles.claimDetailValue}>{claim.additionalInformation}</ThemedText>
                </View>
              )}
              
              {/* Imagens de Verificação */}
              {claim.verificationImages && claim.verificationImages.length > 0 && (
                <View style={styles.claimDetailItem}>
                  <ThemedText style={styles.claimDetailLabel}>Fotos para comprovação:</ThemedText>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.verificationImagesScroll}
                  >
                    {claim.verificationImages.map((image, index) => (
                      <TouchableOpacity 
                        key={index}
                        onPress={() => {
                          setFullscreenImage(image);
                          setFullscreenVisible(true);
                          console.log('Imagem ampliada:', image);
                        }}
                      >
                        <Image 
                          source={{ uri: image }} 
                          style={styles.verificationImage} 
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              {/* Histórico de Status */}
              <ThemedText style={styles.statusHistoryTitle}>Histórico de Status</ThemedText>
              
              {claim.statusHistory && claim.statusHistory.length > 0 ? (
                <View style={styles.statusHistoryList}>
                  {claim.statusHistory.map((history, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.statusHistoryItem,
                        index < claim.statusHistory.length - 1 && styles.statusHistoryItemWithLine
                      ]}
                    >
                      <View 
                        style={[
                          styles.statusHistoryDot,
                          { backgroundColor: getStatusColor(history.status) }
                        ]} 
                      />
                      
                      <View style={styles.statusHistoryContent}>
                        <ThemedText style={styles.statusHistoryStatus}>
                          {getStatusText(history.status)}
                        </ThemedText>
                        <ThemedText style={styles.statusHistoryDate}>
                          {formatDate(history.timestamp)}
                        </ThemedText>
                        {history.comment && (
                          <ThemedText style={styles.statusHistoryComment}>
                            "{history.comment}"
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <ThemedText style={styles.noStatusHistory}>
                  Nenhum histórico de status disponível.
                </ThemedText>
              )}
            </View>
          </ThemedCard>
          
          {/* Botões de Ação */}
          {claim.status === 'PENDING' && (
            <View style={styles.actionsContainer}>
              {isOwner && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => openCommentModal('approve')}
                    disabled={submitting}
                  >
                    <Ionicons name="checkmark-outline" size={22} color="white" />
                    <ThemedText style={styles.actionButtonText}>Aprovar</ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => openCommentModal('reject')}
                    disabled={submitting}
                  >
                    <Ionicons name="close-outline" size={22} color="white" />
                    <ThemedText style={styles.actionButtonText}>Rejeitar</ThemedText>
                  </TouchableOpacity>
                </>
              )}
              
              {isClaimant && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => openCommentModal('cancel')}
                  disabled={submitting}
                >
                  <Ionicons name="ban-outline" size={22} color="white" />
                  <ThemedText style={styles.actionButtonText}>Cancelar</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {claim.status === 'APPROVED' && isOwner && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => openCommentModal('complete')}
                disabled={submitting}
              >
                <Ionicons name="checkmark-done-outline" size={22} color="white" />
                <ThemedText style={styles.actionButtonText}>Concluir</ThemedText>
              </TouchableOpacity>
            </View>
          )}
            {submitting && (
            <View style={styles.submittingContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
              <ThemedText style={styles.submittingText}>Processando...</ThemedText>
            </View>
          )}
        </ScrollView>
        
        {/* Modal para visualização de imagens em tela cheia */}
        <Modal
          visible={fullscreenVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFullscreenVisible(false)}
        >
          <View style={styles.fullscreenImageContainer}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setFullscreenVisible(false)}
            >
              <Ionicons name="close-circle" size={36} color="#fff" />
            </TouchableOpacity>
            
            {fullscreenImage && (
              <Image 
                source={{ uri: fullscreenImage }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
        
        {/* Modal de Comentário */}
        <Portal>
          <PaperModal
            visible={commentVisible}
            onDismiss={() => setCommentVisible(false)}
            contentContainerStyle={[
              styles.modalContainer,
              { backgroundColor: isDark ? colors.card : '#fff' }
            ]}
          >
            <ThemedText style={styles.modalTitle}>
              {actionType === 'approve' ? 'Aprovar Reivindicação' :
               actionType === 'reject' ? 'Rejeitar Reivindicação' :
               actionType === 'cancel' ? 'Cancelar Reivindicação' :
               'Concluir Reivindicação'}
            </ThemedText>
            
            <ThemedText style={styles.modalDescription}>
              {actionType === 'approve' ? 'Ao aprovar, você confirma que esta pessoa é a verdadeira dona do pet.' :
               actionType === 'reject' ? 'Ao rejeitar, você indica que esta pessoa não é a verdadeira dona do pet.' :
               actionType === 'cancel' ? 'Ao cancelar, você desiste desta reivindicação.' :
               'Ao concluir, você confirma que o pet foi devolvido ao seu dono.'}
            </ThemedText>
            
            <TextInput
              style={[
                styles.commentInput,
                { 
                  backgroundColor: isDark ? colors.background : '#f5f5f5',
                  color: colors.text
                }
              ]}
              placeholderTextColor={colors.textTertiary}
              placeholder="Adicione um comentário (opcional)"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.modalButtons}>
              <Button
                mode="text"
                onPress={() => setCommentVisible(false)}
                textColor={colors.text}
                style={styles.modalButton}
              >
                Cancelar
              </Button>
                <Button
                mode="contained"
                onPress={confirmAction}
                buttonColor={colors.accent}
                style={styles.modalButton}
                loading={submitting}
                disabled={submitting}
              >
                Confirmar
              </Button>
            </View>
          </PaperModal>
        </Portal>

        {/* Alerta personalizado para mensagens de chat */}
        <CustomAlert
          visible={chatAlertVisible}
          title="Chat não disponível"
          message={chatAlertMessage}
          onClose={() => setChatAlertVisible(false)}
          confirmText="Entendi"
          type="error"
          icon="chatbubble-ellipses"
        />
      </SafeAreaView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },  statusCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statusCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  statusTextContainer: {
    marginLeft: 12,
  },
  statusTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusDate: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },  section: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  petInfoContainer: {
    padding: 16,
  },
  petImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 16,
  },
  petDetails: {
    
  },
  petName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  petInfo: {
    fontSize: 16,
    marginBottom: 12,
  },
  petAttributesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },  petAttribute: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  petAttributeText: {
    fontSize: 14,
    marginLeft: 4,
  },
  petDescription: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  userInfoContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  contactInfo: {
    
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    marginLeft: 8,
    fontSize: 14,
  },  chatButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chatButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    width: '100%',
  },
  chatButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  claimDetailsContainer: {
    padding: 16,
  },
  claimDetailItem: {
    marginBottom: 12,
  },
  claimDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  claimDetailValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  verificationImagesScroll: {
    marginTop: 8,
  },  verificationImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statusHistoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  statusHistoryList: {
    marginLeft: 8,
  },
  statusHistoryItem: {
    flexDirection: 'row',
    marginBottom: 16,
    position: 'relative',
  },
  statusHistoryItemWithLine: {
    paddingBottom: 8,
  },
  statusHistoryDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
    marginTop: 3,
  },
  statusHistoryContent: {
    flex: 1,
  },
  statusHistoryStatus: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusHistoryDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  statusHistoryComment: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  noStatusHistory: {
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingBottom: 28,
  },  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
  },
  completeButton: {
    backgroundColor: '#2196F3',
  },
  submittingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  submittingText: {
    marginLeft: 8,
  },  modalContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  commentInput: {
    borderRadius: 5,
    padding: 10,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    marginLeft: 8,
  },
  fullscreenImageContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1000,
  },
  fullscreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});