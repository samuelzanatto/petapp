import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Animated, 
  Dimensions,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  type?: 'success' | 'error' | 'warning' | 'info';
  icon?: string;
}

const { width } = Dimensions.get('window');

export const CustomAlert = ({
  visible,
  title,
  message,
  onClose,
  confirmText = 'OK',
  cancelText,
  onConfirm,
  type = 'info',
  icon,
}: CustomAlertProps) => {
  const { colors, isDark } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  // Escolhe o ícone e a cor baseado no tipo de alerta
  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return { 
          name: icon || 'checkmark-circle', 
          color: colors.success,
          backgroundColor: isDark ? 'rgba(178, 144, 100, 0.2)' : 'rgba(178, 144, 100, 0.1)'
        };
      case 'error':
        return { 
          name: icon || 'alert-circle', 
          color: colors.error,
          backgroundColor: isDark ? 'rgba(237, 80, 20, 0.2)' : 'rgba(237, 80, 20, 0.1)'
        };
      case 'warning':
        return { 
          name: icon || 'warning', 
          color: colors.warning,
          backgroundColor: isDark ? 'rgba(237, 154, 112, 0.2)' : 'rgba(237, 154, 112, 0.1)'
        };
      default:
        return { 
          name: icon || 'information-circle', 
          color: colors.accent,
          backgroundColor: isDark ? 'rgba(237, 80, 20, 0.2)' : 'rgba(237, 80, 20, 0.1)'
        };
    }
  };

  const iconConfig = getIconConfig();

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.container}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.alertBox,
                { 
                  backgroundColor: isDark ? colors.card : '#fff',
                  borderColor: colors.border,
                  shadowColor: colors.accent,
                  transform: [{ scale: scaleAnim }],
                  opacity: fadeAnim 
                }
              ]}
            >
              <View 
                style={[
                  styles.iconContainer, 
                  { backgroundColor: iconConfig.backgroundColor }
                ]}
              >
                <Ionicons 
                  name={iconConfig.name as any} 
                  size={40} 
                  color={iconConfig.color}
                  style={styles.icon} 
                />
              </View>
              
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {message}
              </Text>
              
              <View style={styles.buttonContainer}>
                {cancelText && (
                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: colors.border }]}
                    onPress={onClose}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[
                    styles.confirmButton, 
                    { backgroundColor: colors.accent }
                  ]}
                  onPress={() => {
                    if (onConfirm) onConfirm();
                    else onClose();
                  }}
                >
                  <Text style={styles.confirmButtonText}>{confirmText}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: width * 0.85,
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    
    // Efeito glow/neon
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    shadowOpacity: 0.5,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  icon: {
    // Efeito glow no ícone
    textShadowRadius: 15,
    textShadowColor: 'rgba(237, 80, 20, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    marginTop: 5,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: 'bold',
  },
  confirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    
    // Efeito glow nos botões
    shadowColor: '#ED5014',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.5,
    elevation: 5,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});