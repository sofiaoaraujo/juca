import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaskInput from 'react-native-mask-input';

const dataMask = [/\d/, /\d/, '/', /\d/, /\d/, '/', /\d/, /\d/, /\d/, /\d/];


const { width } = Dimensions.get('window');

export default function JucaOnboarding() {
  const [step, setStep] = useState(0); 
  const [nome, setNome] = useState('');
  const [dataNasc, setDataNasc] = useState('');
  const [sexo, setSexo] = useState('');
  const [alergias, setAlergias] = useState('');
  const [neuro, setNeuro] = useState('');

  const totalSteps = 6;
  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(Math.max(0, step - 1));

  const formatarData = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    if (cleaned.length > 4) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    setDataNasc(formatted);
  };

  const alimentos = [
    // FRUTAS
    { name: 'Banana', icon: 'food-banana', color: '#FFF9C4' },
    { name: 'Maçã', icon: 'food-apple', color: '#FFEBEE' },
    { name: 'Pêra', icon: 'food-apple-outline', color: '#F1F8E9' },
    { name: 'Mamão', icon: 'blur', color: '#FFE0B2' },
    { name: 'Abacate', icon: 'food-croissant', color: '#DCEDC8' },
    // VERDURAS/LEGUMES
    { name: 'Brócolis', icon: 'sprout', color: '#E8F5E9' },
    { name: 'Cenoura', icon: 'carrot', color: '#FFF3E0' },
    { name: 'Abóbora', icon: 'octagram-outline', color: '#FFE0B2' },
    { name: 'Chuchu', icon: 'seed-outline', color: '#F0F4C3' },
    // CARBOIDRATOS
    { name: 'Arroz', icon: 'rice', color: '#F5F5F5' },
    { name: 'Batata', icon: 'circle-slice-8', color: '#FFF8E1' },
    { name: 'Macarrão', icon: 'pasta', color: '#FFF9C4' },
    { name: 'Milho', icon: 'corn', color: '#FFF59D' },
    // PROTEÍNAS
    { name: 'Feijão', icon: 'seed', color: '#EFEBE9' },
    { name: 'Ovo', icon: 'egg-easter', color: '#FFFDE7' },
    { name: 'Frango', icon: 'food-drumstick', color: '#FBE9E7' },
    { name: 'Carne', icon: 'food-steak', color: '#FFEBEE' },
  ];

  const Header = () => (
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        {step > 0 && (
          <TouchableOpacity onPress={prevStep} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="#5e5c54" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${(step / totalSteps) * 100}%` }]} />
      </View>
      <View style={styles.headerRight} />
    </View>
  );

  const ArrowButton = ({ onPress, disabled = false }: any) => (
    <TouchableOpacity 
      style={[styles.fab, disabled && { opacity: 0.3 }]} 
      onPress={onPress}
      disabled={disabled}
    >
      <MaterialCommunityIcons name="arrow-right" size={30} color="#fff" />
    </TouchableOpacity>
  );

  // --- RENDEREIZAÇÃO ---

  if (step === 0) return (
    <SafeAreaView style={styles.fullScreen}>
      <Header />
      <View style={styles.centerContent}>
        <Text style={styles.heroText}>Vamos personalizar o Juca para você!</Text>
      </View>
      <ArrowButton onPress={nextStep} />
    </SafeAreaView>
  );

  if (step === 1) return (
    <SafeAreaView style={styles.fullScreen}>
      <Header />
      <View style={styles.centerContent}>
        <Text style={styles.reflectTitle}>Reflita sobre as necessidades do seu pequeno...</Text>
        <Text style={styles.reflectSub}>
          Assim podemos entender melhor e configurar um programa pessoal de introdução alimentar.
        </Text>
      </View>
      <ArrowButton onPress={nextStep} />
    </SafeAreaView>
  );

  if (step === 2) return (
    <SafeAreaView style={styles.fullScreen}>
      <Header />
      <Text style={styles.questionText}>Qual o nome do seu pequeno?</Text>
      <View style={styles.inputBlock}>
        <TextInput 
          style={styles.textInput} 
          placeholder="Como devemos chamar?" 
          placeholderTextColor="#5e5c5480"
          value={nome}
          onChangeText={setNome}
          autoFocus
        />
      </View>
      <ArrowButton onPress={nextStep} disabled={!nome} />
    </SafeAreaView>
  );

  if (step === 3) return (
    <SafeAreaView style={styles.fullScreen}>
      <Header />
      <Text style={styles.questionText}>Quando ele(a) nasceu?</Text>
      <View style={styles.inputBlock}>
        <MaskInput
          style={styles.textInput}
          placeholder="DD / MM / AAAA"
          keyboardType="numeric"
          maxLength={10}
          value={dataNasc}
          mask={dataMask}
          onChangeText={(masked, unmasked) => {
    formatarData(masked); // ou setDataNasc(masked)
  }}
/>
        <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#5e5c54" />
      </View>
      <ArrowButton onPress={nextStep} disabled={dataNasc.length < 10} />
    </SafeAreaView>
  );

  if (step === 4) return (
    <SafeAreaView style={styles.fullScreen}>
      <Header />
      <Text style={styles.questionText}>Qual o sexo biológico?</Text>
      <View style={styles.optionsCol}>
        {['Feminino', 'Masculino'].map((opt) => (
          <TouchableOpacity 
            key={opt}
            style={[styles.optBtn, sexo === opt && styles.optBtnActive]} 
            onPress={() => setSexo(opt)}
          >
            <Text style={[styles.optText, sexo === opt && styles.optTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ArrowButton onPress={nextStep} disabled={!sexo} />
    </SafeAreaView>
  );

  if (step === 5) return (
    <SafeAreaView style={styles.fullScreen}>
      <Header />
      <Text style={styles.questionText}>Alguma restrição ou condição especial?</Text>
      <View style={[styles.inputBlock, { marginBottom: 20 }]}>
        <TextInput 
          style={styles.textInput} 
          placeholder="Alergias (Opcional)" 
          value={alergias} 
          onChangeText={setAlergias} 
        />
      </View>
      <View style={styles.inputBlock}>
        <TextInput 
          style={styles.textInput} 
          placeholder="Neurodivergência (Opcional)" 
          value={neuro} 
          onChangeText={setNeuro} 
        />
        <MaterialCommunityIcons name="brain" size={20} color="#904c1f" />
      </View>
      <ArrowButton onPress={nextStep} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.fullScreen}>
      <Header />
      <Text style={styles.questionText}>O que ele(a) já come bem?</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
        {alimentos.map((item) => (
          <TouchableOpacity key={item.name} style={styles.foodCard}>
            <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
              <MaterialCommunityIcons name={item.icon as any} size={30} color="#904c1f" />
            </View>
            <Text style={styles.foodLabel}>{item.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.foodCard, styles.addCard]}>
          <MaterialCommunityIcons name="plus" size={30} color="#904c1f" />
          <Text style={styles.foodLabel}>Outros</Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.finishBtn} onPress={() => alert('Cadastro Concluído!')}>
          <Text style={styles.finishText}>Finalizar Cadastro</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: '#fcf9ef', paddingHorizontal: 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 40 },
  headerLeft: { width: 40 },
  headerRight: { width: 40 },
  backButton: { marginLeft: -10 },
  progressContainer: { flex: 1, height: 6, backgroundColor: '#e4e3d9', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#b22300' },

  centerContent: { flex: 0.8, justifyContent: 'center', alignItems: 'center' },
  heroText: { fontSize: 36, fontWeight: '800', color: '#1b1c16', textAlign: 'center', lineHeight: 44 },
  reflectTitle: { fontSize: 34, fontWeight: '800', color: '#1b1c16', textAlign: 'center', lineHeight: 42, marginBottom: 20 },
  reflectSub: { fontSize: 18, color: '#5e5c54', textAlign: 'center', lineHeight: 28 },
  questionText: { fontSize: 32, fontWeight: '800', color: '#1b1c16', marginBottom: 30 },
  
  inputBlock: { backgroundColor: '#eae8de', borderRadius: 20, padding: 22, flexDirection: 'row', alignItems: 'center' },
  textInput: { flex: 1, fontSize: 18, color: '#1b1c16', fontWeight: '500' },
  
  fab: { position: 'absolute', bottom: 40, right: 30, width: 70, height: 70, borderRadius: 35, backgroundColor: '#b22300', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  
  optionsCol: { gap: 15 },
  optBtn: { backgroundColor: '#fff', padding: 25, borderRadius: 24, alignItems: 'center', elevation: 2 },
  optBtnActive: { backgroundColor: '#b22300' },
  optText: { fontSize: 18, fontWeight: '700', color: '#1b1c16' },
  optTextActive: { color: '#fff' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 120 },
  foodCard: { width: (width - 80) / 2, backgroundColor: '#fff', padding: 20, borderRadius: 30, alignItems: 'center', marginBottom: 15, elevation: 1 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  foodLabel: { fontWeight: '600', color: '#1b1c16', fontSize: 14 },
  addCard: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#e4e3d9', backgroundColor: 'transparent', elevation: 0 },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 30, backgroundColor: '#fcf9ef' },
  finishBtn: { backgroundColor: '#b22300', padding: 22, borderRadius: 100, alignItems: 'center' },
  finishText: { color: '#fff', fontSize: 18, fontWeight: '700' }
});