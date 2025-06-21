import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme';
import { useAuth } from '@/contexts/auth';
import { router } from 'expo-router';
import { disconnectSocket } from '@/services/socket';

export default function Settings() {
  const { isDark, toggleTheme, theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  
  const handleSignOut = async () => {
    await signOut();
    disconnectSocket();
    router.replace('/auth/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F8F8F8' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#2d2d2d' : '#F8F8F8' }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : '#333333'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#333333' }]}>Configurações</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[
          styles.section, 
          { 
            backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 1)',
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4,
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#333333' }]}>Tema</Text>
          
          {/* Alternador de tema */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color="#ED5014" />
              <Text style={[styles.settingText, { color: isDark ? '#FFFFFF' : '#333333' }]}>
                Tema Escuro
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: isDark ? '#4D4D4D' : '#D9D9D9', true: '#ED9A7099' }}
              thumbColor={isDark ? '#ED5014' : '#ED5014'}
              ios_backgroundColor={isDark ? '#4D4D4D' : '#D9D9D9'}
            />
          </View>
          
          {/* Seletor de Tema */}
          <View style={styles.themeSelector}>
            <TouchableOpacity 
              style={[
                styles.themeOption, 
                theme === 'light' && styles.themeOptionSelected,
                { backgroundColor: isDark ? 'rgba(50, 50, 50, 0.8)' : 'rgba(245, 245, 245, 0.9)' }
              ]}
              onPress={() => setTheme('light')}
              activeOpacity={0.8}
            >
              <Ionicons name="sunny" size={20} color={theme === 'light' ? '#ED5014' : (isDark ? '#FFFFFF' : '#333333')} />
              <Text style={[
                styles.themeOptionText, 
                { color: isDark ? '#FFFFFF' : '#333333' },
                theme === 'light' && { color: '#ED5014' }
              ]}>Claro</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.themeOption, 
                theme === 'dark' && styles.themeOptionSelected,
                { backgroundColor: isDark ? 'rgba(50, 50, 50, 0.8)' : 'rgba(245, 245, 245, 0.9)' }
              ]}
              onPress={() => setTheme('dark')}
              activeOpacity={0.8}
            >
              <Ionicons name="moon" size={20} color={theme === 'dark' ? '#ED5014' : (isDark ? '#FFFFFF' : '#333333')} />
              <Text style={[
                styles.themeOptionText, 
                { color: isDark ? '#FFFFFF' : '#333333' },
                theme === 'dark' && { color: '#ED5014' }
              ]}>Escuro</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.themeOption, 
                theme === 'system' && styles.themeOptionSelected,
                { backgroundColor: isDark ? 'rgba(50, 50, 50, 0.8)' : 'rgba(245, 245, 245, 0.9)' }
              ]}
              onPress={() => setTheme('system')}
              activeOpacity={0.8}
            >
              <Ionicons name="phone-portrait" size={20} color={theme === 'system' ? '#ED5014' : (isDark ? '#FFFFFF' : '#333333')} />
              <Text style={[
                styles.themeOptionText, 
                { color: isDark ? '#FFFFFF' : '#333333' },
                theme === 'system' && { color: '#ED5014' }
              ]}>Sistema</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={[
          styles.section, 
          { 
            backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 1)',
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4,
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#333333' }]}>Conta</Text>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => router.push('/settings/account')}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="person" size={22} color="#ED5014" />
              <Text style={[styles.settingText, { color: isDark ? '#FFFFFF' : '#333333' }]}>
                Editar Perfil
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#FFFFFF' : '#333333'} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => router.push('/settings/notifications')}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={22} color="#ED5014" />
              <Text style={[styles.settingText, { color: isDark ? '#FFFFFF' : '#333333' }]}>
                Notificações
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#FFFFFF' : '#333333'} />
          </TouchableOpacity>
        </View>
        
        <View style={[
          styles.section, 
          { 
            backgroundColor: isDark ? 'rgba(45, 45, 45, 0.7)' : 'rgba(255, 255, 255, 1)',
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 6,
            elevation: 4,
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#333333' }]}>Suporte</Text>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => router.push('/settings/help')}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="help-circle" size={22} color="#ED5014" />
              <Text style={[styles.settingText, { color: isDark ? '#FFFFFF' : '#333333' }]}>
                Ajuda e Suporte
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#FFFFFF' : '#333333'} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <View style={styles.logoutButtonInner}>
              <Ionicons name="log-out" size={22} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>
                Sair
              </Text>
            </View>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 0,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    margin: 15,
    borderRadius: 16,
    padding: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 0,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    marginLeft: 10,
    fontSize: 16,
  },
  themeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 5,
  },
  themeOptionSelected: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  themeOptionText: {
    marginLeft: 5,
    fontSize: 14,
  },
  logoutButton: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ED5014',
    marginHorizontal: 10,
    marginVertical: 10,
  },
  logoutButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  }
});