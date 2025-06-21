import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Text, TextInput, Switch, RadioButton } from 'react-native-paper';
import { router, Redirect } from 'expo-router';
import { useAuth } from '../../contexts/auth';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { usePets } from '@/hooks/usePets';
import { useTheme } from '@/contexts/theme';

export default function PetInfo() {
  const { user, isAuthenticated, loading } = useAuth();
  const { colors, isDark } = useTheme();
  const { createPet } = usePets();
  
  // Estado para controlar a UI
  const [activeSection, setActiveSection] = useState<'basic' | 'characteristics' | 'medical'>('basic');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Informações básicas
  const [petImage, setPetImage] = useState<string | null>(null);
  const [petName, setPetName] = useState('');
  const [petNickname, setPetNickname] = useState('');
  const [petSpecies, setPetSpecies] = useState<'DOG' | 'CAT'>('DOG');
  const [petBreed, setPetBreed] = useState('');
  const [petBirthDate, setPetBirthDate] = useState<Date | null>(null);
  
  // Características
  const [petGender, setPetGender] = useState<'MALE' | 'FEMALE' | null>(null);
  const [petColor, setPetColor] = useState('');
  const [petCoatType, setPetCoatType] = useState('');
  const [petSize, setPetSize] = useState<'SMALL' | 'MEDIUM' | 'LARGE' | null>(null);
  const [petWeight, setPetWeight] = useState('');
  const [petDescription, setPetDescription] = useState('');
  
  // Informações médicas
  const [isNeutered, setIsNeutered] = useState(false);
  const [hasSpecialNeeds, setHasSpecialNeeds] = useState(false);
  const [specialNeedsDescription, setSpecialNeedsDescription] = useState('');
  const [microchipNumber, setMicrochipNumber] = useState('');
  const [medication, setMedication] = useState('');
  const [specialDiet, setSpecialDiet] = useState('');

  // Adicione estes estados para os campos extras
  const [secondaryColor, setSecondaryColor] = useState('');
  const [distinguishingMarks, setDistinguishingMarks] = useState('');
  const [veterinarianContact, setVeterinarianContact] = useState('');
  const [temperament, setTemperament] = useState('');
  const [isTrainedToCommands, setIsTrainedToCommands] = useState(false);
  const [reactsTo, setReactsTo] = useState('');

  // Verificação de autenticação diretamente nesta página
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }
  
  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

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
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPetImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setPetBirthDate(selectedDate);
    }
  };
  
  const validateBasicInfo = () => {
    if (!petName.trim()) {
      Alert.alert('Erro', 'O nome do pet é obrigatório');
      return false;
    }
    return true;
  };
  
  const handleNext = async () => {
    if (activeSection === 'basic') {
      if (!validateBasicInfo()) return;
      setActiveSection('characteristics');
    } 
    else if (activeSection === 'characteristics') {
      setActiveSection('medical');
    } 
    else {
      await savePet();
    }
  };
  
  const handleBack = () => {
    if (activeSection === 'characteristics') {
      setActiveSection('basic');
    } 
    else if (activeSection === 'medical') {
      setActiveSection('characteristics');
    }
  };
  
  const savePet = async () => {
    try {      
      if (!validateBasicInfo()) {
        setActiveSection('basic');
        return;
      }
  
      // Criar FormData para upload
      const formData = new FormData();
      formData.append('name', petName);
      formData.append('species', petSpecies);
      
      // Adicionar campos opcionais se preenchidos
      if (petNickname) formData.append('nickname', petNickname);
      if (petBreed) formData.append('breed', petBreed);
      if (petBirthDate) formData.append('birthdate', petBirthDate.toISOString());
      
      // IMPORTANTE: Use os nomes de campos conforme o backend espera
      if (petGender) formData.append('gender', petGender);
      if (petColor) formData.append('primaryColor', petColor);     // ✅ Em vez de 'color'
      if (petCoatType) formData.append('furType', petCoatType);    // ✅ Em vez de 'coatType'
      if (petSize) formData.append('size', petSize);
      if (petWeight) formData.append('weight', petWeight);
      if (petDescription) formData.append('description', petDescription);
      
      // Informações médicas
      formData.append('isNeutered', String(isNeutered));
      formData.append('hasDisability', String(hasSpecialNeeds));
      if (hasSpecialNeeds && specialNeedsDescription) {
        formData.append('disabilityDetails', specialNeedsDescription);
      }
      if (microchipNumber) formData.append('microchipNumber', microchipNumber);
      if (medication) formData.append('medicationDetails', medication);
      if (specialDiet) formData.append('dietDetails', specialDiet);
  
      // Adicionar campos que estavam faltando
      if (secondaryColor) formData.append('secondaryColor', secondaryColor);
      if (distinguishingMarks) formData.append('distinguishingMarks', distinguishingMarks);
      if (veterinarianContact) formData.append('veterinarianContact', veterinarianContact);
      
      // Adicionar campos de comportamento
      if (temperament) formData.append('temperament', temperament);
      formData.append('isTrainedToCommands', String(isTrainedToCommands));
      if (reactsTo) formData.append('reactsTo', reactsTo);
      
      // Adicionar imagem se foi selecionada
      if (petImage) {
        const fileExtension = petImage.split('.').pop() || 'jpg';
        formData.append('image', {
          uri: petImage,
          name: `pet_${Date.now()}.${fileExtension}`,
          type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
        } as any);
      }
  
      // Log para depuração
      console.log("Enviando dados do pet:", JSON.stringify(Array.from(formData)));
      
      // Enviar para API
      await api.upload('/pets', formData);
      
      // Redirecionar para próxima etapa
      router.push('/onboarding/location-permission');
    } catch (error) {
      console.error('Erro ao salvar pet:', error);
      Alert.alert('Erro', 'Não foi possível salvar as informações do pet. Tente novamente.');
    }
  };

  const renderBasicInfo = () => (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Informações Básicas</Text>
      <View style={styles.imageSection}>
        <TouchableOpacity 
          style={[styles.imagePickerContainer, { 
            borderColor: isDark ? '#444' : '#E0E0E0' 
          }]} 
          onPress={pickImage}
        >
          {petImage ? (
            <Image source={{ uri: petImage }} style={styles.petImage} />
          ) : (
            <View style={[styles.imagePlaceholder, { 
              backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5'
            }]}>
              <Ionicons name="paw" size={40} color={isDark ? '#666' : '#CCCCCC'} />
              <Text style={[styles.imagePlaceholderText, { 
                color: isDark ? '#888' : '#888888'
              }]}>Adicionar foto</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Nome do Pet*</Text>
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text
            }
          ]}
          value={petName}
          onChangeText={setPetName}
          placeholder="Como seu pet se chama?"
          placeholderTextColor={colors.textTertiary}
          mode="outlined"
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Apelido</Text>
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text
            }
          ]}
          value={petNickname}
          onChangeText={setPetNickname}
          placeholder="Apelido carinhoso (opcional)"
          placeholderTextColor={colors.textTertiary}
          mode="outlined"
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
        />
      </View>

      <View style={styles.speciesContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Espécie*</Text>
        <View style={styles.speciesOptions}>
          <TouchableOpacity 
            style={[
              styles.speciesOption, 
              { borderColor: isDark ? '#444' : '#E0E0E0' },
              petSpecies === 'DOG' && { 
                borderColor: '#ED5014',
                backgroundColor: isDark ? 'rgba(237, 80, 20, 0.15)' : 'rgba(237, 80, 20, 0.1)'
              }
            ]}
            onPress={() => setPetSpecies('DOG')}
          >
            <Ionicons 
              name="paw" 
              size={24} 
              color={petSpecies === 'DOG' ? '#ED5014' : isDark ? '#999' : '#888888'} 
            />
            <Text style={[
              styles.speciesText,
              { color: isDark ? '#CCC' : '#666666' },
              petSpecies === 'DOG' && { 
                color: '#ED5014',
                fontWeight: 'bold'
              }
            ]}>
              Cachorro
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.speciesOption, 
              { borderColor: isDark ? '#444' : '#E0E0E0' },
              petSpecies === 'CAT' && { 
                borderColor: '#ED5014',
                backgroundColor: isDark ? 'rgba(237, 80, 20, 0.15)' : 'rgba(237, 80, 20, 0.1)'
              }
            ]}
            onPress={() => setPetSpecies('CAT')}
          >
            <Ionicons 
              name="paw" 
              size={24} 
              color={petSpecies === 'CAT' ? '#ED5014' : isDark ? '#999' : '#888888'} 
            />
            <Text style={[
              styles.speciesText,
              { color: isDark ? '#CCC' : '#666666' },
              petSpecies === 'CAT' && { 
                color: '#ED5014',
                fontWeight: 'bold'
              }
            ]}>
              Gato
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Raça</Text>
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text
            }
          ]}
          value={petBreed}
          onChangeText={setPetBreed}
          placeholder="Qual a raça do seu pet?"
          placeholderTextColor={colors.textTertiary}
          mode="outlined"
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Data de Nascimento</Text>
        <TouchableOpacity 
          style={[styles.datePickerButton, { 
            borderColor: isDark ? '#444' : '#E0E0E0',
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card 
          }]} 
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={[styles.datePickerText, { color: isDark ? '#CCC' : '#666666' }]}>
            {petBirthDate 
              ? petBirthDate.toLocaleDateString('pt-BR') 
              : 'Selecionar data'}
          </Text>
          <Ionicons name="calendar" size={22} color={isDark ? '#AAA' : '#777'} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={petBirthDate || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>
    </View>
  );

  const renderCharacteristics = () => (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Características</Text>

      <View style={styles.genderContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Gênero</Text>
        <View style={styles.genderOptions}>
          <TouchableOpacity 
            style={[
              styles.genderOption, 
              { borderColor: isDark ? '#444' : '#E0E0E0' },
              petGender === 'MALE' && { 
                borderColor: '#ED5014',
                backgroundColor: isDark ? 'rgba(237, 80, 20, 0.15)' : 'rgba(237, 80, 20, 0.1)'
              }
            ]}
            onPress={() => setPetGender('MALE')}
          >
            <Ionicons 
              name="male" 
              size={20} 
              color={petGender === 'MALE' ? '#ED5014' : isDark ? '#AAA' : '#666666'} 
            />
            <Text style={[
              styles.genderText, 
              { color: isDark ? '#CCC' : '#666666' },
              petGender === 'MALE' && { color: '#ED5014', fontWeight: 'bold' }
            ]}>
              Macho
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.genderOption,
              { borderColor: isDark ? '#444' : '#E0E0E0' }, 
              petGender === 'FEMALE' && { 
                borderColor: '#ED5014',
                backgroundColor: isDark ? 'rgba(237, 80, 20, 0.15)' : 'rgba(237, 80, 20, 0.1)'
              }
            ]}
            onPress={() => setPetGender('FEMALE')}
          >
            <Ionicons 
              name="female" 
              size={20} 
              color={petGender === 'FEMALE' ? '#ED5014' : isDark ? '#AAA' : '#666666'} 
            />
            <Text style={[
              styles.genderText,
              { color: isDark ? '#CCC' : '#666666' }, 
              petGender === 'FEMALE' && { color: '#ED5014', fontWeight: 'bold' }
            ]}>
              Fêmea
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Cor Predominante</Text>
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text
            }
          ]}
          value={petColor}
          onChangeText={setPetColor}
          placeholder="Ex: Preto, Branco, Caramelo..."
          placeholderTextColor={colors.textTertiary}
          mode="outlined"
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Cor Secundária</Text>
        <TextInput
          value={secondaryColor}
          onChangeText={setSecondaryColor}
          placeholder="Cor secundária (se aplicável)"
          textColor={isDark ? '#FFFFFF' : colors.text}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text
            }
          ]}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
          mode="outlined"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Tipo de Pelagem</Text>
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text
            }
          ]}
          value={petCoatType}
          onChangeText={setPetCoatType}
          placeholder="Ex: Curta, Longa, Encaracolada..."
          placeholderTextColor={colors.textTertiary}
          mode="outlined"
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Marcas Distintivas</Text>
        <TextInput
          value={distinguishingMarks}
          onChangeText={setDistinguishingMarks}
          placeholder="Manchas específicas, cicatrizes, etc."
          placeholderTextColor={colors.textTertiary}
          textColor={isDark ? '#FFFFFF' : colors.text}
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text
            }
          ]}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
          mode="outlined"
        />
      </View>

      <View style={styles.sizeContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Porte</Text>
        <View style={styles.sizeOptions}>
          <TouchableOpacity 
            style={[
              styles.sizeOption,
              { borderColor: isDark ? '#444' : '#E0E0E0' }, 
              petSize === 'SMALL' && { 
                borderColor: '#ED5014',
                backgroundColor: isDark ? 'rgba(237, 80, 20, 0.15)' : 'rgba(237, 80, 20, 0.1)'
              }
            ]}
            onPress={() => setPetSize('SMALL')}
          >
            <Text style={[
              styles.sizeText,
              { color: isDark ? '#CCC' : '#666666' },
              petSize === 'SMALL' && { color: '#ED5014', fontWeight: 'bold' }
            ]}>
              Pequeno
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.sizeOption,
              { borderColor: isDark ? '#444' : '#E0E0E0' }, 
              petSize === 'MEDIUM' && { 
                borderColor: '#ED5014',
                backgroundColor: isDark ? 'rgba(237, 80, 20, 0.15)' : 'rgba(237, 80, 20, 0.1)'
              }
            ]}
            onPress={() => setPetSize('MEDIUM')}
          >
            <Text style={[
              styles.sizeText,
              { color: isDark ? '#CCC' : '#666666' },
              petSize === 'MEDIUM' && { color: '#ED5014', fontWeight: 'bold' }
            ]}>
              Médio
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.sizeOption,
              { borderColor: isDark ? '#444' : '#E0E0E0' }, 
              petSize === 'LARGE' && { 
                borderColor: '#ED5014',
                backgroundColor: isDark ? 'rgba(237, 80, 20, 0.15)' : 'rgba(237, 80, 20, 0.1)'
              }
            ]}
            onPress={() => setPetSize('LARGE')}
          >
            <Text style={[
              styles.sizeText,
              { color: isDark ? '#CCC' : '#666666' },
              petSize === 'LARGE' && { color: '#ED5014', fontWeight: 'bold' }
            ]}>
              Grande
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Temperamento</Text>
        <TextInput
          value={temperament}
          onChangeText={setTemperament}
          placeholder="Ex: Dócil, Brincalhão, Tímido, etc."
          placeholderTextColor={colors.textTertiary}
          textColor={isDark ? '#FFFFFF' : colors.text}
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text
            }
          ]}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
          mode="outlined"
        />
      </View>

      <View style={styles.switchContainer}>
        <View style={styles.switchTextContainer}>
          <Text style={[styles.switchLabel, {color: colors.text}]}>
            Responde a Comandos Básicos
          </Text>
          <Text style={[styles.switchDescription, {color: colors.textTertiary}]}>
            O pet obedece comandos como sentar, ficar, etc.
          </Text>
        </View>
        <Switch
          value={isTrainedToCommands}
          onValueChange={setIsTrainedToCommands}
          color="#ED5014"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Reage a</Text>
        <TextInput
          value={reactsTo}
          onChangeText={setReactsTo}
          placeholder="Estímulos específicos, sons, etc."
          placeholderTextColor={colors.textTertiary}
          textColor={isDark ? '#FFFFFF' : colors.text}
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text
            }
          ]}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
          mode="outlined"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Peso (kg)</Text>
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text
            }
          ]}
          value={petWeight}
          onChangeText={(text) => setPetWeight(text.replace(/[^0-9.]/g, ''))}
          placeholder="Peso em kg"
          placeholderTextColor={colors.textTertiary}
          keyboardType="numeric"
          mode="outlined"
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            }
          }}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Descrição</Text>
        <TextInput
          style={[
            styles.input, 
            styles.textArea, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text,
              paddingTop: 10
            }
          ]}
          value={petDescription}
          onChangeText={setPetDescription}
          placeholder="Conte um pouco sobre a personalidade do seu pet"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={4}
          mode="outlined"
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
        />
      </View>
    </View>
  );

  const renderMedicalInfo = () => (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Informações Médicas</Text>

      <View style={styles.switchContainer}>
        <View style={styles.switchTextContainer}>
          <Text style={[styles.switchLabel, {color: colors.text}]}>Castrado/Esterilizado</Text>
          <Text style={[styles.switchDescription, {color: colors.textTertiary}]}>
            O pet já passou por procedimento de castração
          </Text>
        </View>
        <Switch
          value={isNeutered}
          onValueChange={setIsNeutered}
          color="#ED5014"
        />
      </View>

      <View style={styles.switchContainer}>
        <View style={styles.switchTextContainer}>
          <Text style={[styles.switchLabel, {color: colors.text}]}>Necessidades Especiais</Text>
          <Text style={[styles.switchDescription, {color: colors.textTertiary}]}>
            O pet possui alguma deficiência ou condição especial
          </Text>
        </View>
        <Switch
          value={hasSpecialNeeds}
          onValueChange={setHasSpecialNeeds}
          color="#ED5014"
        />
      </View>

      {hasSpecialNeeds && (
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Descrição das Necessidades Especiais</Text>
          <TextInput
            style={[
              styles.input, 
              styles.textArea, 
              { 
                backgroundColor: colors.card,
                color: isDark ? '#FFFFFF' : colors.text,
                paddingTop: 10
              }
            ]}
            value={specialNeedsDescription}
            onChangeText={setSpecialNeedsDescription}
            placeholder="Descreva as necessidades especiais do seu pet"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            mode="outlined"
            textColor={isDark ? '#FFFFFF' : colors.text}
            theme={{ 
              colors: { 
                primary: '#ED5014',
                background: colors.card,
                text: colors.text,
                placeholder: colors.textTertiary,
                outline: isDark ? '#444' : '#E0E0E0',
                onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
              } 
            }}
          />
        </View>
      )}

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Contato Veterinário</Text>
        <TextInput
          value={veterinarianContact}
          onChangeText={setVeterinarianContact}
          placeholder="Nome e telefone do veterinário"
          placeholderTextColor={colors.textTertiary}
          textColor={isDark ? '#FFFFFF' : colors.text}
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text
            }
          ]}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
          mode="outlined"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Número do Microchip</Text>
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text
            }
          ]}
          value={microchipNumber}
          onChangeText={setMicrochipNumber}
          placeholder="Se o pet possui microchip"
          placeholderTextColor={colors.textTertiary}
          mode="outlined"
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Medicamentos</Text>
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text
            }
          ]}
          value={medication}
          onChangeText={setMedication}
          placeholder="Medicamentos que o pet toma regularmente"
          placeholderTextColor={colors.textTertiary}
          mode="outlined"
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Dieta Especial</Text>
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: colors.card,
              color: isDark ? '#FFFFFF' : colors.text
            }
          ]}
          value={specialDiet}
          onChangeText={setSpecialDiet}
          placeholder="Alimentos recomendados ou restrições"
          placeholderTextColor={colors.textTertiary}
          mode="outlined"
          textColor={isDark ? '#FFFFFF' : colors.text}
          theme={{ 
            colors: { 
              primary: '#ED5014',
              background: colors.card,
              text: colors.text,
              placeholder: colors.textTertiary,
              outline: isDark ? '#444' : '#E0E0E0',
              onSurfaceVariant: isDark ? '#AAAAAA' : '#666666'
            } 
          }}
        />
      </View>

      <View style={[styles.infoContainer, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9F9F9' 
      }]}>
        <Ionicons name="information-circle-outline" size={18} color={isDark ? '#AAA' : '#777'} />
        <Text style={[styles.infoText, { color: isDark ? '#BBB' : '#666666' }]}>
          Essas informações serão muito importantes caso seu pet se perca.
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.progress}>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
            <View style={[styles.progressFill, { width: 
              activeSection === 'basic' ? '33%' : 
              activeSection === 'characteristics' ? '66%' : '100%' 
            }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={[
              styles.progressLabel,
              { color: isDark ? '#999' : '#999999' },
              activeSection === 'basic' && { color: '#ED5014', fontWeight: 'bold' }
            ]}>
              Básico
            </Text>
            <Text style={[
              styles.progressLabel,
              { color: isDark ? '#999' : '#999999' },
              activeSection === 'characteristics' && { color: '#ED5014', fontWeight: 'bold' }
            ]}>
              Características
            </Text>
            <Text style={[
              styles.progressLabel,
              { color: isDark ? '#999' : '#999999' },
              activeSection === 'medical' && { color: '#ED5014', fontWeight: 'bold' }
            ]}>
              Saúde
            </Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Cadastro do Pet</Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          Vamos cadastrar seu pet para você poder encontrá-lo caso ele se perca
        </Text>

        {activeSection === 'basic' && renderBasicInfo()}
        {activeSection === 'characteristics' && renderCharacteristics()}
        {activeSection === 'medical' && renderMedicalInfo()}

        <View style={styles.navigationButtons}>
          {activeSection !== 'basic' && (
            <TouchableOpacity 
              style={[styles.backButton, { 
                borderColor: '#ED5014',
                backgroundColor: isDark ? 'rgba(237,80,20,0.1)' : 'transparent'
              }]} 
              onPress={handleBack}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>Voltar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextButton, { flex: activeSection === 'basic' ? 1 : 0.5 }]}
            onPress={handleNext}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#CCCCCC', '#AAAAAA'] : ['#ED5014', '#ED5014']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.nextButtonText}>
                  {activeSection === 'medical' ? 'Finalizar' : 'Continuar'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  progress: {
    marginTop: 60,
    marginBottom: 20,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#ED5014',
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePickerContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    borderWidth: 1,
  },
  petImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 12,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    minHeight: 50,
  },
  textArea: {
    minHeight: 100,
  },
  speciesContainer: {
    marginBottom: 20,
  },
  speciesOptions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  speciesOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 10,
    flex: 1,
    justifyContent: 'center',
  },
  speciesText: {
    marginLeft: 8,
    fontSize: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 4,
  },
  datePickerText: {
    fontSize: 16,
  },
  genderContainer: {
    marginBottom: 20,
  },
  genderOptions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 10,
    flex: 1,
    justifyContent: 'center',
  },
  genderText: {
    marginLeft: 8,
    fontSize: 16,
  },
  sizeContainer: {
    marginBottom: 20,
  },
  sizeOptions: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  sizeOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    flex: 0.32,
    alignItems: 'center',
  },
  sizeText: {
    fontSize: 14,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
  },
  infoContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  backButton: {
    flex: 0.45,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 10,
  },
  backButtonText: {
    color: '#ED5014',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradientButton: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});