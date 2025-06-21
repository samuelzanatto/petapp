import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { LinearGradient } from 'expo-linear-gradient';

type FAQItem = {
  question: string;
  answer: string;
  expanded?: boolean;
};

export default function Help() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  
  const [faqItems, setFaqItems] = useState<FAQItem[]>([
    {
      question: 'Como cadastrar um novo pet?',
      answer: 'Acesse a aba "Perfil", toque no botão "+" próximo ao cabeçalho "Meus Pets" e siga as instruções para adicionar um novo pet. Você precisará de fotos e informações básicas sobre o animal.'
    },
    {
      question: 'O que fazer se encontrei um pet perdido?',
      answer: 'Vá até a aba "Perdidos", registre a localização e informações sobre o animal. Se possível, tire uma foto. O aplicativo irá notificar os usuários da região que um pet foi encontrado.'
    },
    {
      question: 'Como reportar um pet perdido?',
      answer: 'Na aba "Reportar", selecione a opção "Pet Perdido", preencha as informações sobre seu pet, a última localização conhecida e adicione fotos recentes. Quanto mais informações você fornecer, maiores são as chances de encontrá-lo.'
    },
    {
      question: 'Como alterar minhas informações de perfil?',
      answer: 'Acesse seu perfil, toque no ícone de configurações (engrenagem) e depois em "Configurações da Conta". Lá você poderá editar seu nome, e-mail e outras informações pessoais.'
    },
    {
      question: 'É possível excluir minha conta?',
      answer: 'Sim. Vá em "Configurações" > "Configurações da Conta" > "Gerenciar Conta" e selecione a opção "Excluir Conta". Lembre-se que essa ação é irreversível e todos os seus dados serão removidos permanentemente.'
    }
  ]);

  const toggleFAQ = (index: number) => {
    const updatedFAQs = [...faqItems];
    updatedFAQs[index].expanded = !updatedFAQs[index].expanded;
    setFaqItems(updatedFAQs);
  };

  const contactSupport = () => {
    Linking.openURL('mailto:suporte@petapp.com').catch(() => {
      Alert.alert(
        'Erro',
        'Não foi possível abrir seu aplicativo de e-mail. Por favor, envie um e-mail manualmente para suporte@petapp.com'
      );
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
      <View style={[styles.header, { 
        backgroundColor: isDark ? '#2d2d2d' : '#F8F8F8',
      }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle} color={colors.textHeader}>
          Ajuda e Suporte
        </ThemedText>
        <View style={{width: 40}} />
      </View>

      <ScrollView 
        style={[styles.content, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ThemedCard style={[styles.supportCard, {
          shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.1,
          shadowRadius: 6,
          elevation: 4,
        }]}>
          <View style={styles.supportCardContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="help-buoy" size={38} color={colors.accent} />
            </View>
            <View style={styles.supportTextContainer}>
              <ThemedText type="subtitle" style={styles.supportTitle} color={colors.accent}>
                Como podemos ajudar?
              </ThemedText>
              <ThemedText style={[styles.supportText, { color: colors.textTertiary }]}>
                Entre em contato com nossa equipe de suporte através do e-mail ou consulte as perguntas frequentes abaixo.
              </ThemedText>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.contactButton} 
            onPress={contactSupport}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={18} color="#FFF" style={styles.buttonIcon} />
            <ThemedText style={styles.buttonText}>Contato por E-mail</ThemedText>
          </TouchableOpacity>
        </ThemedCard>

        <ThemedText type="subtitle" style={styles.sectionTitle} color={colors.textHeader}>
          Perguntas Frequentes
        </ThemedText>

        {faqItems.map((item, index) => (
          <ThemedCard key={index} style={[styles.faqItem, {
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4,
          }]}>
            <TouchableOpacity 
              style={styles.faqHeader} 
              onPress={() => toggleFAQ(index)}
              activeOpacity={0.7}
            >
              <ThemedText type="subtitle" style={styles.faqQuestion} color={colors.textHeader}>
                {item.question}
              </ThemedText>
              <Ionicons 
                name={item.expanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.textHeader}
              />
            </TouchableOpacity>
            
            {item.expanded && (
              <View style={[styles.faqAnswer, { 
                borderTopColor: isDark ? 'rgba(150, 150, 150, 0.1)' : 'rgba(0, 0, 0, 0.05)'
              }]}>
                <ThemedText style={[styles.answerText, { color: colors.textSecondary }]}>
                  {item.answer}
                </ThemedText>
              </View>
            )}
          </ThemedCard>
        ))}

        <View style={styles.additionalHelpContainer}>
          <ThemedText type="subtitle" style={styles.additionalHelpTitle} color={colors.textHeader}>
            Precisa de mais ajuda?
          </ThemedText>
          <ThemedText style={[styles.additionalHelpText, { color: colors.textTertiary }]}>
            Nossa equipe de suporte está disponível de segunda a sexta, das 9h às 18h. 
            Respondemos a todos os e-mails em até 24 horas.
          </ThemedText>
          
          <ThemedText style={[styles.versionInfo, { color: colors.textTertiary }]}>
            Versão do aplicativo: 1.0.0
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  supportCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
  },
  supportCardContent: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  iconContainer: {
    marginRight: 15,
  },
  supportTextContainer: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#ED5014',
  },
  gradientButton: {
    height: '100%',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  faqItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    paddingRight: 10,
  },
  faqAnswer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
  },
  additionalHelpContainer: {
    marginVertical: 25,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  additionalHelpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  additionalHelpText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  versionInfo: {
    fontSize: 12,
    marginTop: 10,
    marginBottom: 30,
  },
});