import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaskInput from 'react-native-mask-input';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFilhos } from '../context/FilhosContext';
import api from '../services/api'; // <-- IMPORTAÇÃO DA API AQUI

const dataMask = [/\d/, /\d/, '/', /\d/, /\d/, '/', /\d/, /\d/, /\d/, /\d/];
const { width } = Dimensions.get('window');

const ALIMENTOS = [
  { name: 'Banana', icon: 'fruit-cherries', color: '#FFF9C4' },
  { name: 'Maçã', icon: 'food-apple', color: '#FFEBEE' },
  { name: 'Mamão', icon: 'fruit-pineapple', color: '#FFE0B2' },
  { name: 'Manga', icon: 'fruit-grapes', color: '#FFF3E0' },
  { name: 'Melancia', icon: 'fruit-watermelon', color: '#FCE4EC' },
  { name: 'Cenoura', icon: 'carrot', color: '#FFF3E0' },
  { name: 'Brócolis', icon: 'sprout', color: '#E8F5E9' },
  { name: 'Abobrinha', icon: 'leaf', color: '#F1F8E9' },
  { name: 'Beterraba', icon: 'circle-slice-8', color: '#FCE4EC' },
  { name: 'Chuchu', icon: 'leaf-circle-outline', color: '#F0F4C3' },
  { name: 'Arroz', icon: 'rice', color: '#F5F5F5' },
  { name: 'Batata', icon: 'pot-steam-outline', color: '#FFF8E1' },
  { name: 'Batata-Doce', icon: 'nutrition', color: '#FFE0B2' },
  { name: 'Macarrão', icon: 'pasta', color: '#FFF9C4' },
  { name: 'Mandioca', icon: 'corn', color: '#FFFDE7' },
  { name: 'Feijão', icon: 'seed', color: '#EFEBE9' },
  { name: 'Ovo', icon: 'egg', color: '#FFFDE7' },
  { name: 'Frango', icon: 'food-drumstick', color: '#FBE9E7' },
  { name: 'Carne Moída', icon: 'food-steak', color: '#FFEBEE' },
  { name: 'Inhame', icon: 'mushroom-outline', color: '#F3E5F5' },
];

export default function OnboardingFilho() {
  const router = useRouter();
  const { recarregar } = useFilhos();

  const [step, setStep] = useState(0);
  const [nome, setNome] = useState('');
  const [dataNasc, setDataNasc] = useState('');
  const [sexo, setSexo] = useState('');
  const [alergias, setAlergias] = useState('');
  const [neuro, setNeuro] = useState<string[]>([]); // <-- Agora é um Array
  const [alimentosSelecionados, setAlimentosSelecionados] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  const totalSteps = 6;
  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => Math.max(0, s - 1));

  const toggleAlimento = (nomeAlimento: string) => {
    setAlimentosSelecionados(prev =>
      prev.includes(nomeAlimento)
        ? prev.filter(i => i !== nomeAlimento)
        : [...prev, nomeAlimento]
    );
  };

  const toggleNeuro = (opcao: string) => {
    if (opcao === 'Nenhuma') {
      setNeuro(['Nenhuma']);
      return;
    }
    setNeuro(prev => {
      const semNenhuma = prev.filter(n => n !== 'Nenhuma');
      return semNenhuma.includes(opcao)
        ? semNenhuma.filter(n => n !== opcao)
        : [...semNenhuma, opcao];
    });
  };

  const handleFinalizar = async () => {
    setSalvando(true);
    try {
      // 1. CRIAR A CRIANÇA
      const dataFormatada = dataNasc.split('/').reverse().join('-');

      const responseCrianca = await api.post('/criancas/', {
        nome: nome,
        data_nascimento: dataFormatada,
        sexo: sexo,
        cuidador_id: 'de8ea771-326e-470c-a2a3-f2ef5425a53f', // ID mockado por enquanto
      });

      const criancaId = responseCrianca.data.id;

      // 2. VINCULAR NEURODIVERGÊNCIAS (AGORA TRATA O ARRAY MÚLTIPLO)
      if (neuro && neuro.length > 0 && !neuro.includes('Nenhuma')) {
        const respNeuro = await api.get('/neurodivergencias/');
        
        for (const neuroTexto of neuro) {
          const neuroEncontrada = respNeuro.data.find(
            (n: any) => n.neurodivergencia.toLowerCase() === neuroTexto.toLowerCase()
          );

          if (neuroEncontrada) {
            await api.post('/criancas-neurodivergencias/', {
              crianca_id: criancaId,
              neurodivergencia_id: neuroEncontrada.id,
            });
          }
        }
      }

      // 3. VINCULAR ALERGIAS (CRIANDO AS QUE NÃO EXISTEM)
      if (alergias && alergias.trim() !== '') {
        const respAlergias = await api.get('/alergias/');
        const alergiasExistentes = respAlergias.data;
        const alergiasDigitadas = alergias.split(',').map(a => a.trim());

        for (const alergiaTexto of alergiasDigitadas) {
          if (!alergiaTexto) continue;

          let alergiaId = null;
          const alergiaEncontrada = alergiasExistentes.find(
            (a: any) => a.nome.toLowerCase() === alergiaTexto.toLowerCase()
          );

          if (alergiaEncontrada) {
            alergiaId = alergiaEncontrada.id;
          } else {
            const novaAlergia = await api.post('/alergias/', { nome: alergiaTexto });
            alergiaId = novaAlergia.data.id;
          }

          if (alergiaId) {
            await api.post('/criancas-alergias/', {
              crianca_id: criancaId,
              alergia_id: alergiaId,
            });
          }
        }
      }

      // 4. VINCULAR ALIMENTOS INICIAIS
      const alimentosDB = await api.get('/alimentos/');
      for (const nomeAlimento of alimentosSelecionados) {
        const alimento = alimentosDB.data.find((a: any) => a.nome === nomeAlimento);
        if (alimento) {
          await api.post('/progresso/', {
            crianca_id: criancaId,
            alimento_id: alimento.id,
            status: 'Aceita',
          });
        }
      }

      // 5. RECARREGAR FILHOS NO CONTEXTO PARA INCLUIR O NOVO FILHO CRIADO
      await recarregar();

      router.replace('/(tabs)/home');

    } catch (error: any) {
      console.error('Erro ao salvar no back-end:', error?.response?.data || error.message);
      Alert.alert('Erro', 'Não foi possível salvar os dados no servidor. Verifique a conexão.');
    } finally {
      setSalvando(false);
    }
  };

  const Header = () => (
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        {step > 0 && (
          <TouchableOpacity onPress={prevStep} activeOpacity={0.7} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="#5e5c54" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${((step + 1) / totalSteps) * 100}%` }]} />
      </View>
      <TouchableOpacity onPress={() => router.back()} style={styles.headerRight}>
        <MaterialCommunityIcons name="close" size={22} color="#5e5c54" />
      </TouchableOpacity>
    </View>
  );

  const ArrowButton = ({ onPress, disabled = false }: any) => (
    <TouchableOpacity
      style={[styles.fab, disabled && { opacity: 0.3 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons name="arrow-right" size={30} color="#fff" />
    </TouchableOpacity>
  );

  // Step 0 — Nome
  if (step === 0) return (
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

  // Step 1 — Data de nascimento
  if (step === 1) return (
    <SafeAreaView style={styles.fullScreen}>
      <Header />
      <Text style={styles.questionText}>Quando {nome} nasceu?</Text>
      <View style={styles.inputBlock}>
        <MaskInput
          style={styles.textInput}
          placeholder="DD / MM / AAAA"
          placeholderTextColor="#5e5c5480"
          keyboardType="numeric"
          maxLength={10}
          value={dataNasc}
          mask={dataMask}
          onChangeText={(masked) => setDataNasc(masked)}
        />
        <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#5e5c54" />
      </View>
      <ArrowButton onPress={nextStep} disabled={dataNasc.length < 10} />
    </SafeAreaView>
  );

  // Step 2 — Sexo
  if (step === 2) return (
    <SafeAreaView style={styles.fullScreen}>
      <Header />
      <Text style={styles.questionText}>Qual o sexo biológico?</Text>
      <View style={styles.optionsCol}>
        {['Feminino', 'Masculino'].map((opt) => (
          <TouchableOpacity
            key={opt}
            activeOpacity={0.7}
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

  // Step 3 — Alergias
  if (step === 3) return (
    <SafeAreaView style={styles.fullScreen}>
      <Header />
      <Text style={styles.questionText}>Alguma alergia alimentar?</Text>
      <Text style={styles.questionSub}>Opcional — liste as alergias conhecidas</Text>
      <View style={styles.inputBlock}>
        <TextInput
          style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder="Ex: Amendoim, Lactose, Glúten..."
          placeholderTextColor="#5e5c5480"
          value={alergias}
          onChangeText={setAlergias}
          multiline
        />
      </View>
      <ArrowButton onPress={nextStep} />
    </SafeAreaView>
  );

  // Step 4 — Neurodivergência
  if (step === 4) return (
    <SafeAreaView style={styles.fullScreen}>
      <Header />
      <Text style={styles.questionText}>Alguma neurodivergência?</Text>
      <Text style={styles.questionSub}>Opcional — selecione todas que se aplicam</Text>
      <View style={styles.optionsGrid}>
        {['TEA', 'TDAH', 'Transtorno de Ansiedade', 'TARE', 'Outra', 'Nenhuma'].map((opcao) => (
          <TouchableOpacity
            key={opcao}
            activeOpacity={0.7}
            style={[styles.neuroBtn, neuro.includes(opcao) && styles.neuroBtnActive]}
            onPress={() => toggleNeuro(opcao)}
          >
            <Text style={[styles.neuroText, neuro.includes(opcao) && styles.neuroTextActive]}>
              {opcao}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ArrowButton onPress={nextStep} />
    </SafeAreaView>
  );

  // Step 5 — Alimentos
  return (
    <SafeAreaView style={styles.fullScreen}>
      <Header />
      <Text style={styles.questionText}>O que {nome} já come bem?</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
        {ALIMENTOS.map((item) => (
          <TouchableOpacity
            key={item.name}
            activeOpacity={0.7}
            style={[
              styles.foodCard,
              alimentosSelecionados.includes(item.name) && styles.foodCardActive,
            ]}
            onPress={() => toggleAlimento(item.name)}
          >
            <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
              <MaterialCommunityIcons name={item.icon as any} size={30} color="#904c1f" />
            </View>
            <Text style={[
              styles.foodLabel,
              alimentosSelecionados.includes(item.name) && styles.foodLabelActive,
            ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.finishBtn, salvando && { opacity: 0.6 }]}
          onPress={handleFinalizar}
          disabled={salvando}
          activeOpacity={0.8}
        >
          <Text style={styles.finishText}>
            {salvando ? 'Salvando...' : 'Adicionar filho'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: '#fcf9ef', paddingHorizontal: 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 40 },
  headerLeft: { width: 40 },
  headerRight: { width: 40, alignItems: 'flex-end' },
  backButton: { marginLeft: -10 },
  progressContainer: { flex: 1, height: 6, backgroundColor: '#e4e3d9', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#b22300' },
  questionText: { fontSize: 32, fontWeight: '800', color: '#1b1c16', marginBottom: 30 },
  questionSub: { fontSize: 14, color: '#5e5c54', marginBottom: 20, marginTop: -20 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  neuroBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 100, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e4e3d9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  neuroBtnActive: { backgroundColor: '#b22300', borderColor: '#b22300' },
  neuroText: { fontSize: 15, fontWeight: '600', color: '#1b1c16' },
  neuroTextActive: { color: '#fff' },
  inputBlock: { backgroundColor: '#eae8de', borderRadius: 20, padding: 22, flexDirection: 'row', alignItems: 'center' },
  textInput: { flex: 1, fontSize: 18, color: '#1b1c16', fontWeight: '500' },
  fab: { position: 'absolute', bottom: 40, right: 30, width: 70, height: 70, borderRadius: 35, backgroundColor: '#b22300', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 4 },
  optionsCol: { gap: 15 },
  optBtn: { backgroundColor: '#fff', padding: 25, borderRadius: 24, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  optBtnActive: { backgroundColor: '#b22300' },
  optText: { fontSize: 18, fontWeight: '700', color: '#1b1c16' },
  optTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 20 },
  foodCard: { width: (width - 80) / 2, backgroundColor: '#fff', padding: 20, borderRadius: 30, alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: 'transparent', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  foodCardActive: { borderWidth: 2, borderColor: '#b22300', backgroundColor: '#fff5f3' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  foodLabel: { fontWeight: '600', color: '#1b1c16', fontSize: 14, textAlign: 'center' },
  foodLabelActive: { color: '#b22300' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 30, backgroundColor: '#fcf9ef' },
  finishBtn: { backgroundColor: '#b22300', padding: 22, borderRadius: 100, alignItems: 'center' },
  finishText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});