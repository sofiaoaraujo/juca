import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFilhos } from '../../context/FilhosContext';
import { obterSugestoesFoodChaining, atualizarStatusNoCacheSugestoes, type SugestaoAlimento } from '../../services/gemini';
import { salvarEtapaSOS, buscarEtapasSalvas, recusarAlimento, uploadFotoConquista } from '../../services/progresso';
import { resolverImagem } from '../../utils/alimentos';
import { supabase } from '../../services/supabase';

const { width, height } = Dimensions.get('window');
const TRILHA_WIDTH = width - 48;

// ─── Tipos ────────────────────────────────────────────────────────────────────
type SOSEtapa = {
  id: string;
  label: string;
  descricao: string;
  dica: string;
  icon: string;
  ehFinal?: boolean;
};

type AlimentoSugerido = SugestaoAlimento & {
  icon: string;
  corFundo: string;
  corIcone: string;
};

// ─── Etapas SOS ──────────────────────────────────────────────────────────────
const ETAPAS_SOS: SOSEtapa[] = [
  { id: 'tolerar', label: 'Tolerar', descricao: 'O alimento está na mesa ou prato próximo', icon: 'eye-outline', dica: 'Coloque o alimento no prato sem forçar. Elogie só por olhar — isso já é uma grande conquista!' },
  { id: 'interagir', label: 'Interagir', descricao: 'Tocar, explorar ou brincar com o alimento', icon: 'hand-wave-outline', dica: 'Permita exploração livre. Deixe a criança apertar, empurrar ou brincar. Um dedo já é uma conquista!' },
  { id: 'cheirar', label: 'Cheirar', descricao: 'Aproximar o nariz e sentir o aroma', icon: 'emoticon-outline', dica: 'Transforme em brincadeira: "Que cheiro tem esse alimento?" Cheirar juntos torna a experiência mais segura.' },
  { id: 'beijar', label: 'Beijar / Lamber', descricao: 'Encostar os lábios ou dar uma lambida', icon: 'emoticon-kiss-outline', dica: 'Celebre qualquer contato com a boca! Mesmo uma lambidinha rápida é um avanço enorme.' },
  { id: 'morder', label: 'Morder', descricao: 'Dar uma mordida sem precisar engolir', icon: 'tooth-outline', dica: 'Tudo bem cuspir depois. O objetivo é o contato oral — engolir vem com o tempo!' },
  { id: 'comer', label: 'Comer', descricao: 'Mastigar e engolir o alimento', icon: 'check-circle-outline', dica: 'Grande conquista! Tire uma foto para guardar esse momento especial!', ehFinal: true },
];

// STATUS_TO_ETAPA movido para services/progresso.ts

const POSICOES_X = [
  TRILHA_WIDTH * 0.18,
  TRILHA_WIDTH * 0.55,
  TRILHA_WIDTH * 0.18,
  TRILHA_WIDTH * 0.55,
  TRILHA_WIDTH * 0.18,
  TRILHA_WIDTH * 0.55,
];
const ESPACO_Y = 130;
const CIRCULO_R = 36;

// ─── Cores por categoria ──────────────────────────────────────────────────────
const CORES_CATEGORIA: Record<string, { fundo: string; icone: string; icon: string }> = {
  Fruta:       { fundo: '#FFFDE7', icone: '#FFF9C4', icon: 'fruit-cherries' },
  Legume:      { fundo: '#FFF3E0', icone: '#FFE0B2', icon: 'carrot' },
  Verdura:     { fundo: '#F1F8E9', icone: '#DCEDC8', icon: 'leaf' },
  Proteína:    { fundo: '#FCE4EC', icone: '#F8BBD0', icon: 'food-steak' },
  Carboidrato: { fundo: '#FFF8E1', icone: '#FFECB3', icon: 'bread-slice' },
  Laticínio:   { fundo: '#E3F2FD', icone: '#BBDEFB', icon: 'cup' },
  default:     { fundo: '#F3E5F5', icone: '#E1BEE7', icon: 'food' },
};


// ─── Componente de loading com caju pulsando ─────────────────────────────────
function CajuLoading() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.92, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={cajuLoadingStyles.container}>
      <Animated.Image
        source={require('../../assets/images/caju-loading.png')}
        style={[cajuLoadingStyles.imagem, { transform: [{ scale: pulseAnim }] }]}
        resizeMode="contain"
      />
      <Text style={cajuLoadingStyles.texto}>Preparando sugestões...</Text>
    </View>
  );
}

const cajuLoadingStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    marginBottom: 28,
  },
  imagem: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  texto: {
    fontSize: 14,
    color: '#904c1f',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

// ─── Componente Trilha ────────────────────────────────────────────────────────
function TrilhaSOS({
  etapasConcluidas,
  onEtapaConcluida,
  onSalvar,
  onRecusar,
  salvando,
  nomeFilho,
  alimentoNome,
  confettiRef,
}: {
  etapasConcluidas: string[];
  onEtapaConcluida: (id: string, foto?: string) => void;
  onSalvar: () => void;
  onRecusar: () => void;
  salvando: boolean;
  nomeFilho: string;
  alimentoNome: string;
  confettiRef: React.RefObject<any>;
}) {
  const [etapaAberta, setEtapaAberta] = useState<SOSEtapa | null>(null);
  const [celebrandoVisivel, setCelebrandoVisivel] = useState(false);
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);
  const [recusarConfirmVisivel, setRecusarConfirmVisivel] = useState(false);
  const [recusaPendente, setRecusaPendente] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const proximaIdx = ETAPAS_SOS.findIndex(e => !etapasConcluidas.includes(e.id));
  const todasConcluidas = etapasConcluidas.length === ETAPAS_SOS.length;

  const getEstado = (idx: number): 'concluida' | 'atual' | 'bloqueada' => {
    if (etapasConcluidas.includes(ETAPAS_SOS[idx].id)) return 'concluida';
    if (idx === proximaIdx) return 'atual';
    return 'bloqueada';
  };

  const svgHeight = ETAPAS_SOS.length * ESPACO_Y + 40;

  const gerarPath = () => {
    let d = '';
    for (let i = 0; i < ETAPAS_SOS.length - 1; i++) {
      const x1 = POSICOES_X[i] + CIRCULO_R;
      const y1 = i * ESPACO_Y + CIRCULO_R + 20;
      const x2 = POSICOES_X[i + 1] + CIRCULO_R;
      const y2 = (i + 1) * ESPACO_Y + CIRCULO_R + 20;
      if (i === 0) d += `M ${x1} ${y1}`;
      d += ` C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`;
    }
    return d;
  };

  const pathConcluido = etapasConcluidas.length > 1
    ? Math.min(etapasConcluidas.length - 1, ETAPAS_SOS.length - 1)
    : 0;

  const tirarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setFotoCapturada(result.assets[0].uri);
    }
  };

  const escolherDaGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setFotoCapturada(result.assets[0].uri);
    }
  };

  const concluirEtapaFinal = () => {
    onEtapaConcluida('comer', fotoCapturada ?? undefined);
    setCelebrandoVisivel(false);
    setFotoCapturada(null);
    setTimeout(() => confettiRef.current?.start(), 100);
  };

  const handleCompletarEtapa = (etapa: SOSEtapa) => {
    if (etapa.ehFinal) {
      setEtapaAberta(null);
      setCelebrandoVisivel(true);
    } else {
      onEtapaConcluida(etapa.id);
      setEtapaAberta(null);
    }
  };

  return (
    <View style={{ width: TRILHA_WIDTH, alignSelf: 'center' }}>
      {/* SVG sinuoso */}
      <Svg width={TRILHA_WIDTH} height={svgHeight} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Path d={gerarPath()} stroke="#e4e3d9" strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray="12 8" />
        {etapasConcluidas.length > 0 && (
          <Path d={gerarPath()} stroke="#b22300" strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${pathConcluido * 200} 9999`} />
        )}
      </Svg>

      {/* Círculos */}
      {ETAPAS_SOS.map((etapa, idx) => {
        const estado = getEstado(idx);
        const cx = POSICOES_X[idx];
        const cy = idx * ESPACO_Y + 20;
        const labelRight = POSICOES_X[idx] > TRILHA_WIDTH / 2;

        return (
          <View key={etapa.id} style={{ position: 'absolute', top: cy, left: cx }}>
            {estado === 'atual' && (
              <Animated.View style={{
                position: 'absolute', top: -8, left: -8,
                width: CIRCULO_R * 2 + 16, height: CIRCULO_R * 2 + 16,
                borderRadius: CIRCULO_R + 8, backgroundColor: 'rgba(178,35,0,0.12)',
                transform: [{ scale: pulseAnim }],
              }} />
            )}
            <TouchableOpacity
              activeOpacity={estado === 'bloqueada' ? 1 : 0.8}
              onPress={() => {
                if (estado === 'bloqueada' || recusaPendente) return;
                if (etapa.ehFinal && !etapasConcluidas.includes(etapa.id)) {
                  setCelebrandoVisivel(true);
                } else {
                  setEtapaAberta(etapa);
                }
              }}
              style={[
                trilhaStyles.circulo,
                estado === 'concluida' && trilhaStyles.circuloConcluido,
                estado === 'atual' && trilhaStyles.circuloAtual,
                estado === 'bloqueada' && trilhaStyles.circuloBloqueado,
              ]}
            >
              {estado === 'concluida' ? (
                <MaterialCommunityIcons name="check" size={26} color="#fff" />
              ) : (
                <MaterialCommunityIcons name={etapa.icon as any} size={26} color={estado === 'atual' ? '#b22300' : '#c4c2b8'} />
              )}
            </TouchableOpacity>
            <Text style={[
              trilhaStyles.label,
              labelRight && trilhaStyles.labelRight,
              estado === 'concluida' && trilhaStyles.labelConcluida,
              estado === 'atual' && trilhaStyles.labelAtual,
            ]}>
              {etapa.label.toUpperCase()}
            </Text>
          </View>
        );
      })}

      <View style={{ height: svgHeight }} />

      {/* Botões de ação */}
      <View style={trilhaStyles.botoesRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={trilhaStyles.recusarBtn}
          onPress={() => setRecusarConfirmVisivel(true)}
        >
          <MaterialCommunityIcons name="close-circle-outline" size={18} color="#904c1f" />
          <Text style={trilhaStyles.recusarText}>Alimento Recusado</Text>
        </TouchableOpacity>
        {etapasConcluidas.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={trilhaStyles.salvarBtn}
            onPress={onSalvar}
          >
            <MaterialCommunityIcons name={todasConcluidas ? 'star' : 'check-circle-outline'} size={20} color="#fff" />
            <Text style={trilhaStyles.salvarText}>
              {todasConcluidas ? 'Concluir Trilha ⭐' : 'Fechar Trilha'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal etapa normal */}
      <Modal visible={!!etapaAberta && !etapaAberta?.ehFinal} animationType="slide" transparent onRequestClose={() => setEtapaAberta(null)}>
        <View style={trilhaStyles.overlay}>
          <View style={trilhaStyles.modalCard}>
            <View style={[trilhaStyles.modalIcone, etapaAberta && etapasConcluidas.includes(etapaAberta.id) ? trilhaStyles.modalIconeConcluido : trilhaStyles.modalIconeAtual]}>
              <MaterialCommunityIcons name={(etapaAberta?.icon ?? 'star') as any} size={34} color={etapaAberta && etapasConcluidas.includes(etapaAberta.id) ? '#fff' : '#b22300'} />
            </View>
            <Text style={trilhaStyles.modalSuper}>ETAPA SOS</Text>
            <Text style={trilhaStyles.modalTitulo}>{etapaAberta?.label}</Text>
            <Text style={trilhaStyles.modalDescricao}>{etapaAberta?.descricao}</Text>
            <View style={trilhaStyles.dicaBox}>
              <Text style={trilhaStyles.dicaTexto}>{etapaAberta?.dica}</Text>
            </View>
            {etapaAberta && !etapasConcluidas.includes(etapaAberta.id) ? (
              <TouchableOpacity activeOpacity={0.85} style={trilhaStyles.completeiBtn} onPress={() => etapaAberta && handleCompletarEtapa(etapaAberta)}>
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
                <Text style={trilhaStyles.completeiText}>Completei esta etapa!</Text>
              </TouchableOpacity>
            ) : (
              <View style={trilhaStyles.jaFeitoBox}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#b22300" />
                <Text style={trilhaStyles.jaFeitoText}>Etapa já concluída nesta sessão</Text>
              </View>
            )}
            <TouchableOpacity activeOpacity={0.7} onPress={() => setEtapaAberta(null)} style={{ paddingVertical: 12 }}>
              <Text style={trilhaStyles.fecharText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal celebração — etapa COMER */}
      <Modal visible={celebrandoVisivel} animationType="slide" transparent onRequestClose={() => setCelebrandoVisivel(false)}>
        <View style={trilhaStyles.overlay}>
          <View style={[trilhaStyles.modalCard, { paddingTop: 32 }]}>
            <Text style={trilhaStyles.celebracaoTitulo}>Que conquista incrível!</Text>
            <Text style={trilhaStyles.celebracaoDesc}>
              {nomeFilho} comeu {alimentoNome}! Reconheça esse momento com calma e no ritmo dela.
            </Text>

            <View style={trilhaStyles.celebracaoSugestoes}>
              <Text style={trilhaStyles.celebracaoSugestoesTitle}>Formas de celebrar:</Text>
              <Text style={trilhaStyles.celebracaoItem}>• Elogie com voz calma e animada: "Você conseguiu!"</Text>
              <Text style={trilhaStyles.celebracaoItem}>• Ofereça a brincadeira ou atividade favorita</Text>
              <Text style={trilhaStyles.celebracaoItem}>• Um olhar de orgulho e um sorriso já dizem tudo</Text>
            </View>

            {/* Foto */}
            <Text style={trilhaStyles.fotoTitulo}>Registre esse momento</Text>
            {fotoCapturada ? (
              <View style={trilhaStyles.fotoPreviewWrap}>
                <Image source={{ uri: fotoCapturada }} style={trilhaStyles.fotoPreview} />
                <TouchableOpacity activeOpacity={0.7} style={trilhaStyles.trocarFotoBtn} onPress={() => setFotoCapturada(null)}>
                  <MaterialCommunityIcons name="close-circle" size={24} color="#b22300" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={trilhaStyles.fotoBtns}>
                <TouchableOpacity activeOpacity={0.75} style={trilhaStyles.fotoBtn} onPress={tirarFoto}>
                  <MaterialCommunityIcons name="camera" size={22} color="#b22300" />
                  <Text style={trilhaStyles.fotoBtnText}>Tirar foto</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.75} style={trilhaStyles.fotoBtn} onPress={escolherDaGaleria}>
                  <MaterialCommunityIcons name="image-multiple-outline" size={22} color="#b22300" />
                  <Text style={trilhaStyles.fotoBtnText}>Galeria</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity activeOpacity={0.85} style={trilhaStyles.completeiBtn} onPress={concluirEtapaFinal}>
              <MaterialCommunityIcons name="star" size={20} color="#fff" />
              <Text style={trilhaStyles.completeiText}>
                {fotoCapturada ? 'Salvar com foto!' : 'Salvar conquista!'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmação de recusa */}
      <Modal visible={recusarConfirmVisivel} animationType="fade" transparent onRequestClose={() => setRecusarConfirmVisivel(false)}>
        <View style={trilhaStyles.overlay}>
          <View style={[trilhaStyles.modalCard, { paddingTop: 28 }]}>
            <View style={trilhaStyles.recusarConfirmIcone}>
              <MaterialCommunityIcons name="heart-outline" size={36} color="#b22300" />
            </View>
            <Text style={trilhaStyles.recusarConfirmTitulo}>Não desista ainda! 💛</Text>
            <Text style={trilhaStyles.recusarConfirmMsg}>
              Sabemos que introduzir um novo alimento pode ser cansativo e desafiador. Cada tentativa conta, mesmo as que parecem pequenas. Tente mais uma vez — estamos torcendo por vocês!
            </Text>
            <View style={trilhaStyles.recusarConfirmDica}>
              <MaterialCommunityIcons name="lightbulb-outline" size={18} color="#904c1f" />
              <Text style={trilhaStyles.recusarConfirmDicaTexto}>
                Estudos mostram que uma criança pode precisar de 15 a 20 exposições a um alimento antes de aceitá-lo. Cada contato é um passo!
              </Text>
            </View>
            <View style={trilhaStyles.recusarConfirmBtns}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={trilhaStyles.recusarConfirmCancelarBtn}
                onPress={() => setRecusarConfirmVisivel(false)}
              >
                <MaterialCommunityIcons name="arrow-left" size={18} color="#b22300" />
                <Text style={trilhaStyles.recusarConfirmCancelarText}>Vou tentar mais</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={trilhaStyles.recusarConfirmOkBtn}
                onPress={() => { setRecusaPendente(true); setRecusarConfirmVisivel(false); setTimeout(() => onRecusar(), 350); }}
              >
                <Text style={trilhaStyles.recusarConfirmOkText}>Confirmar recusa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { filhos, filhoAtivo, setFilhoAtivo } = useFilhos();
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [seletorVisivel, setSeletorVisivel] = useState(false);
  const [alimentoAtivo, setAlimentoAtivo] = useState<AlimentoSugerido | null>(null);
  const [sugestoes, setSugestoes] = useState<AlimentoSugerido[]>([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);

  const carregarSugestoes = async (forceRefresh = false) => {
    if (!filhoAtivo?.id) return;
    setCarregandoSugestoes(true);
    try {
      const resultado = await obterSugestoesFoodChaining(filhoAtivo.id, forceRefresh);
      const comCores = resultado.map(s => {
        const cores = CORES_CATEGORIA[s.categoria ?? ''] ?? CORES_CATEGORIA.default;
        return { ...s, name: s.nome, icon: cores.icon, corFundo: cores.fundo, corIcone: cores.icone };
      });
      setSugestoes(comCores);
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
    } finally {
      setCarregandoSugestoes(false);
    }
  };
  
  const [trilhaVisivel, setTrilhaVisivel] = useState(false);
  const [etapasConcluidas, setEtapasConcluidas] = useState<string[]>([]);
  const [etapasAnteriores, setEtapasAnteriores] = useState<string[]>([]);
  const [fotosSessao, setFotosSessao] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const confettiHomeRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const nome = user?.user_metadata?.nome;
      if (nome) setNomeUsuario(nome);
    });
  }, []);

  useEffect(() => {
    if (filhoAtivo) carregarSugestoes();
  }, [filhoAtivo?.id]);

  const abrirTrilha = async (alimento: AlimentoSugerido) => {
    setAlimentoAtivo(alimento);
    setEtapasConcluidas([]);
    setFotosSessao([]);

    // Busca etapas antes de abrir o modal para evitar flash de trilha vazia.
    // Só então abre o modal com o progresso já restaurado.
    let etapasRestauradas: string[] = [];
    if (filhoAtivo?.id && alimento.id) {
      etapasRestauradas = await buscarEtapasSalvas(filhoAtivo.id, alimento.id);
    }
    setEtapasAnteriores(etapasRestauradas);
    setTrilhaVisivel(true);
  };

  const fecharTrilha = () => {
    setTrilhaVisivel(false);
    setAlimentoAtivo(null);
    setEtapasConcluidas([]);
    setFotosSessao([]);
    setEtapasAnteriores([]);
  };

  // Auto-save: persiste cada etapa imediatamente ao ser concluída.
  // Para a etapa "comer" com foto, encadeia o upload após o insert da row.
  const onEtapaConcluida = (id: string, foto?: string) => {
    setEtapasConcluidas(prev => [...prev, id]);
    if (foto) setFotosSessao(prev => [...prev, foto]);
    if (!filhoAtivo?.id || !alimentoAtivo?.id) return;

    const criancaId = filhoAtivo.id;
    const alimentoId = alimentoAtivo.id;

    const pipeline = async () => {
      await salvarEtapaSOS(criancaId, alimentoId, id);
      if (id === 'comer' && foto) {
        await uploadFotoConquista(foto, criancaId, alimentoId);
      }
    };
    pipeline().catch(e => console.error('Erro ao salvar etapa:', e));
  };

  // Salvar sessão: fecha a trilha e marca localmente como 'Comer' se concluída
  const salvarSessao = () => {
    if (alimentoAtivo && etapasTotais.includes('comer')) {
      const idConcluido = alimentoAtivo.id;
      setSugestoes(prev => prev.map(s =>
        s.id === idConcluido ? { ...s, status: 'Comer' } : s
      ));
    }
    fecharTrilha();
  };

  const onRecusarAlimento = async () => {
    if (filhoAtivo?.id && alimentoAtivo?.id) {
      const criancaId  = filhoAtivo.id;
      const alimentoId = alimentoAtivo.id;
      recusarAlimento(criancaId, alimentoId).catch(e =>
        console.error('Erro ao registrar recusa:', e)
      );
      setSugestoes(prev => prev.map(s =>
        s.id === alimentoId ? { ...s, status: 'Recusado' } : s
      ));
      atualizarStatusNoCacheSugestoes(criancaId, alimentoId, 'Recusado').catch(() => {});
    }
    fecharTrilha();
  };

  // Vaga = alimento que foi concluído ('Comer') ou recusado ('Recusado') na sessão atual
  const temVagas = sugestoes.some(s => s.status === 'Recusado' || s.status === 'Comer');

  const sugerirNovos = () => carregarSugestoes(true);

  const etapasTotais = [...new Set([...etapasAnteriores, ...etapasConcluidas])];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerTexto}>
            <Text style={styles.greeting}>{nomeUsuario ? `Olá, ${nomeUsuario}!` : 'Olá!'}</Text>
            <Text style={styles.titulo}>
              {filhoAtivo ? `Jornada ${filhoAtivo.sexo === 'Feminino' ? 'da' : 'do'} ${filhoAtivo.nome}` : 'Sua Jornada Hoje'}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.75} style={styles.seletorBtn} onPress={() => setSeletorVisivel(true)}>
            <Text style={styles.seletorNome} numberOfLines={1}>{filhoAtivo?.nome ?? 'Selecionar'}</Text>
            <MaterialCommunityIcons name="chevron-down" size={16} color="#904c1f" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitulo}>Escolha um alimento para iniciar a trilha sensorial de hoje.</Text>

        <View style={styles.badge}>
          <MaterialCommunityIcons name="link-variant" size={13} color="#904c1f" />
          <Text style={styles.badgeText}>Método Food Chaining</Text>
        </View>

        {/* Cards */}
        {carregandoSugestoes ? (
          <CajuLoading />
        ) : sugestoes.length > 0 ? (
          <View style={styles.cardsRow}>
            {sugestoes.map((alimento) => {
              const foiRecusado = alimento.status === 'Recusado';
              return (
              <TouchableOpacity
                key={alimento.id}
                activeOpacity={foiRecusado ? 1 : 0.75}
                style={[styles.foodCard, { backgroundColor: alimento.corFundo }, foiRecusado && styles.foodCardRecusado]}
                onPress={() => { if (!foiRecusado) abrirTrilha(alimento); }}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardCategoria, foiRecusado && { color: '#a89f91' }]} numberOfLines={1}>{(alimento.categoria ?? 'Alimento').toUpperCase()}</Text>
                  {foiRecusado ? (
                    <View style={styles.badgeRecusado}>
                      <MaterialCommunityIcons name="close-circle-outline" size={10} color="#999" />
                      <Text style={styles.badgeRecusadoText}>Recusado</Text>
                    </View>
                  ) : alimento.status ? (
                    <View style={styles.badgeAndamento}>
                      <MaterialCommunityIcons name="clock-outline" size={10} color="#b22300" />
                      <Text style={styles.badgeAndamentoText}>Em andamento</Text>
                    </View>
                  ) : null}
                </View>
                <View style={[styles.iconeCircle, { backgroundColor: alimento.corIcone }, foiRecusado && { opacity: 0.4 }]}>
                  <Image source={resolverImagem(alimento.nome, alimento.categoria ?? undefined)} style={styles.cardImagem} resizeMode="contain" />
                </View>
                <Text style={[styles.cardNome, foiRecusado && { color: '#a89f91' }]}>{alimento.nome}</Text>
                <Text style={[styles.cardMotivo, foiRecusado && { color: '#c4c2b8' }]}>{alimento.motivo}</Text>
                {foiRecusado ? (
                  <View style={styles.cardBotaoRecusado}>
                    <Text style={styles.cardBotaoRecusadoText}>Alimento recusado</Text>
                  </View>
                ) : (
                  <View style={styles.cardBotao}>
                    <Text style={styles.cardBotaoText}>{alimento.status ? 'Retomar Trilha' : 'Iniciar Trilha'}</Text>
                    <MaterialCommunityIcons name="arrow-right" size={13} color="#b22300" />
                  </View>
                )}
              </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.8} style={styles.recarregarBox} onPress={() => carregarSugestoes()}>
            <MaterialCommunityIcons name="refresh" size={24} color="#b22300" />
            <Text style={styles.recarregarText}>Buscar sugestões</Text>
          </TouchableOpacity>
        )}

        {/* Botão Sugerir Novos — aparece quando há vagas abertas */}
        {temVagas && !carregandoSugestoes && (
          <TouchableOpacity activeOpacity={0.85} style={styles.sugerirNovosBtn} onPress={sugerirNovos}>
            <MaterialCommunityIcons name="shimmer" size={20} color="#b22300" />
            <Text style={styles.sugerirNovosText}>Sugerir Novos Alimentos</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* Modal Seletor */}
      <Modal visible={seletorVisivel} animationType="fade" transparent onRequestClose={() => setSeletorVisivel(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSeletorVisivel(false)}>
          <View style={styles.seletorModal}>
            <Text style={styles.seletorTitulo}>ESCOLHER FILHO</Text>
            {filhos.map(filho => (
              <TouchableOpacity key={filho.id} activeOpacity={0.75} style={[styles.seletorItem, filhoAtivo?.id === filho.id && styles.seletorItemAtivo]} onPress={() => { setFilhoAtivo(filho); setSeletorVisivel(false); }}>
                <View style={[styles.seletorAvatar, filhoAtivo?.id === filho.id && styles.seletorAvatarAtivo]}>
                  <MaterialCommunityIcons name={filho.sexo === 'Feminino' ? 'human-female' : 'human-male'} size={20} color={filhoAtivo?.id === filho.id ? '#fff' : '#904c1f'} />
                </View>
                <View style={styles.seletorItemTexto}>
                  <Text style={[styles.seletorItemNome, filhoAtivo?.id === filho.id && styles.seletorItemNomeAtivo]}>{filho.nome}</Text>
                  <Text style={styles.seletorItemIdade}>{filho.dataNasc || 'Sem data'}</Text>
                </View>
                {filhoAtivo?.id === filho.id && <MaterialCommunityIcons name="check" size={18} color="#b22300" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity activeOpacity={0.75} style={styles.adicionarBtn} onPress={() => { setSeletorVisivel(false); router.push('/onboarding-filho'); }}>
              <View style={styles.adicionarIcone}>
                <MaterialCommunityIcons name="plus" size={20} color="#b22300" />
              </View>
              <Text style={styles.adicionarTexto}>Adicionar novo filho</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Trilha SOS */}
      <Modal visible={trilhaVisivel} animationType="slide" presentationStyle="pageSheet" onRequestClose={fecharTrilha}>
        <SafeAreaView style={styles.trilhaContainer}>
          {/* Confete ao salvar */}
          <ConfettiCannon
            ref={confettiHomeRef}
            count={120}
            origin={{ x: width / 2, y: -20 }}
            autoStart={false}
            fadeOut
            colors={['#b22300', '#904c1f', '#ffdbc9', '#FFD700', '#FF6B6B', '#FFF9C4']}
          />
          <View style={styles.trilhaHeader}>
            <View style={styles.trilhaHeaderLeft}>
              <View style={[styles.trilhaIconeCircle, { backgroundColor: alimentoAtivo?.corIcone ?? '#eee' }]}>
                {alimentoAtivo && (
                  <Image source={resolverImagem(alimentoAtivo.nome, alimentoAtivo.categoria ?? undefined)} style={{ width: 32, height: 32 }} resizeMode="contain" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trilhaSuper}>TRILHA SENSORIAL · SOS</Text>
                <Text style={styles.trilhaTitulo} numberOfLines={1}>{alimentoAtivo?.nome}</Text>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.7} style={styles.fecharBtnHeader} onPress={fecharTrilha}>
              <MaterialCommunityIcons name="close" size={20} color="#5e5c54" />
            </TouchableOpacity>
          </View>

          <View style={styles.progressBarRow}>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${(etapasTotais.length / ETAPAS_SOS.length) * 100}%` }]} />
            </View>
            <Text style={styles.progressBarLabel}>{etapasTotais.length}/{ETAPAS_SOS.length}</Text>
          </View>

          <Text style={styles.instrucao}>
            {etapasTotais.length > 0
              ? 'Trilha retomada! Toque na etapa destacada para continuar de onde parou.'
              : 'Toque na etapa destacada para ver as dicas. Cada etapa só é desbloqueada após a anterior!'}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <TrilhaSOS
              etapasConcluidas={etapasTotais}
              onEtapaConcluida={onEtapaConcluida}
              onSalvar={salvarSessao}
              onRecusar={onRecusarAlimento}
              salvando={salvando}
              nomeFilho={filhoAtivo?.nome ?? 'seu pequeno'}
              alimentoNome={alimentoAtivo?.nome ?? 'o alimento'}
              confettiRef={confettiHomeRef}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles Trilha ────────────────────────────────────────────────────────────
const trilhaStyles = StyleSheet.create({
  circulo: { width: CIRCULO_R * 2, height: CIRCULO_R * 2, borderRadius: CIRCULO_R, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0eee4' },
  circuloConcluido: { backgroundColor: '#b22300', shadowColor: '#b22300', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  circuloAtual: { backgroundColor: '#fff', borderWidth: 3, borderColor: '#b22300', shadowColor: '#b22300', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  circuloBloqueado: { backgroundColor: '#f0eee4', opacity: 0.6 },
  label: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: '#c4c2b8', textAlign: 'left', marginTop: 6, width: 80 },
  labelRight: { textAlign: 'right' },
  labelConcluida: { color: '#b22300' },
  labelAtual: { color: '#1b1c16' },
  botoesRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginHorizontal: 16 },
  salvarBtn: { backgroundColor: '#b22300', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 100, flex: 1, shadowColor: '#b22300', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 5 },
  salvarText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  recusarBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 100, backgroundColor: 'rgba(144,76,31,0.08)', borderWidth: 1.5, borderColor: 'rgba(144,76,31,0.25)' },
  recusarText: { color: '#904c1f', fontSize: 14, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(27,28,22,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fcf9ef', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 28, alignItems: 'center', maxHeight: height * 0.9 },
  modalIcone: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalIconeAtual: { backgroundColor: '#fff5f3', borderWidth: 2, borderColor: '#b22300' },
  modalIconeConcluido: { backgroundColor: '#b22300' },
  modalSuper: { fontSize: 10, fontWeight: '700', color: '#904c1f', letterSpacing: 1.5, marginBottom: 6 },
  modalTitulo: { fontSize: 24, fontWeight: '800', color: '#1b1c16', marginBottom: 8, textAlign: 'center' },
  modalDescricao: { fontSize: 15, color: '#5e5c54', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  dicaBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#ffdbc9', borderRadius: 16, padding: 14, marginBottom: 24, width: '100%' },
  dicaTexto: { flex: 1, fontSize: 13, color: '#904c1f', lineHeight: 20 },
  completeiBtn: { backgroundColor: '#b22300', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, paddingHorizontal: 32, borderRadius: 100, width: '100%', marginBottom: 12, elevation: 4 },
  completeiText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  jaFeitoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f6f4ea', borderRadius: 100, paddingVertical: 12, paddingHorizontal: 20, marginBottom: 12 },
  jaFeitoText: { fontSize: 14, color: '#b22300', fontWeight: '600' },
  fecharText: { fontSize: 14, color: '#5e5c54', fontWeight: '600' },

  // Celebração
  celebracaoTitulo: { fontSize: 24, fontWeight: '800', color: '#1b1c16', textAlign: 'center', marginBottom: 8 },
  celebracaoDesc: { fontSize: 15, color: '#5e5c54', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  celebracaoSugestoes: { backgroundColor: '#f6f4ea', borderRadius: 16, padding: 14, width: '100%', marginBottom: 20 },
  celebracaoSugestoesTitle: { fontSize: 13, fontWeight: '700', color: '#904c1f', marginBottom: 8 },
  celebracaoItem: { fontSize: 13, color: '#5e5c54', lineHeight: 22 },
  fotoTitulo: { fontSize: 14, fontWeight: '700', color: '#1b1c16', marginBottom: 12, alignSelf: 'flex-start' },
  fotoBtns: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 20 },
  fotoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff5f3', borderRadius: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: 'rgba(178,35,0,0.2)' },
  fotoBtnText: { fontSize: 14, fontWeight: '700', color: '#b22300' },
  fotoPreviewWrap: { width: '100%', marginBottom: 20, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  fotoPreview: { width: '100%', height: 180, borderRadius: 16 },
  trocarFotoBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderRadius: 12 },

  // Confirmação de recusa
  recusarConfirmIcone: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff5f3', borderWidth: 2, borderColor: '#b22300', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  recusarConfirmTitulo: { fontSize: 22, fontWeight: '800', color: '#1b1c16', textAlign: 'center', marginBottom: 10 },
  recusarConfirmMsg: { fontSize: 15, color: '#5e5c54', textAlign: 'center', lineHeight: 23, marginBottom: 18, paddingHorizontal: 4 },
  recusarConfirmDica: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#ffdbc9', borderRadius: 16, padding: 14, marginBottom: 24, width: '100%' },
  recusarConfirmDicaTexto: { flex: 1, fontSize: 13, color: '#904c1f', lineHeight: 20 },
  recusarConfirmBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  recusarConfirmCancelarBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, borderRadius: 100, backgroundColor: '#fff5f3', borderWidth: 1.5, borderColor: 'rgba(178,35,0,0.2)' },
  recusarConfirmCancelarText: { color: '#b22300', fontSize: 14, fontWeight: '700' },
  recusarConfirmOkBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 100, backgroundColor: 'rgba(144,76,31,0.1)', borderWidth: 1.5, borderColor: 'rgba(144,76,31,0.25)' },
  recusarConfirmOkText: { color: '#904c1f', fontSize: 14, fontWeight: '700' },
});

// ─── Styles principais ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf9ef' },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  logo: { width: 52, height: 52, borderRadius: 14 },
  headerTexto: { flex: 1 },
  greeting: { fontSize: 12, color: '#5e5c54', fontWeight: '500', marginBottom: 2 },
  titulo: { fontSize: 26, fontWeight: '800', color: '#1b1c16', letterSpacing: -0.5 },
  seletorBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffdbc9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, maxWidth: 110 },
  seletorNome: { fontSize: 12, color: '#904c1f', fontWeight: '700', flex: 1 },
  subtitulo: { fontSize: 16, color: '#904c1f', lineHeight: 24, marginBottom: 16 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#ffdbc9', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, marginBottom: 28, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeText: { fontSize: 12, color: '#904c1f', fontWeight: '700' },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 28 },
  loadingBox: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 40, marginBottom: 28 },
  loadingText: { fontSize: 14, color: '#904c1f', textAlign: 'center' },
  recarregarBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20, marginBottom: 28, backgroundColor: '#fff5f3', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(178,35,0,0.15)' },
  recarregarText: { fontSize: 15, fontWeight: '700', color: '#b22300' },
  sugerirNovosBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 100, backgroundColor: '#fff5f3', borderWidth: 1.5, borderColor: 'rgba(178,35,0,0.2)', marginBottom: 28 },
  sugerirNovosText: { fontSize: 15, fontWeight: '700', color: '#b22300' },
  foodCard: { width: '47%', borderRadius: 28, padding: 18, alignItems: 'stretch', shadowColor: '#4b4944', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 32, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  cardCategoria: { fontSize: 10, fontWeight: '700', color: '#904c1f', letterSpacing: 1.5, flex: 1, flexShrink: 1 },
  badgeAndamento: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(178,35,0,0.08)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 100, flexShrink: 0, marginLeft: 4 },
  badgeAndamentoText: { fontSize: 9, fontWeight: '700', color: '#b22300', letterSpacing: 0 },
  iconeCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 14, overflow: 'hidden', alignSelf: 'center' },
  cardImagem: { width: 72, height: 72 },
  cardNome: { fontSize: 15, fontWeight: '800', color: '#1b1c16', textAlign: 'center', marginBottom: 6 },
  cardMotivo: { fontSize: 11, color: '#5e5c54', textAlign: 'center', lineHeight: 15, marginBottom: 14 },
  cardBotao: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(178,35,0,0.08)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, alignSelf: 'center' },
  cardBotaoText: { fontSize: 12, color: '#b22300', fontWeight: '700' },
  foodCardRecusado: { opacity: 0.55 },
  badgeRecusado: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 100, flexShrink: 0, marginLeft: 4 },
  badgeRecusadoText: { fontSize: 9, fontWeight: '700', color: '#999', letterSpacing: 0 },
  cardBotaoRecusado: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, alignSelf: 'center' },
  cardBotaoRecusadoText: { fontSize: 12, color: '#a89f91', fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(27,28,22,0.4)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 100, paddingRight: 24 },
  seletorModal: { backgroundColor: '#fff', borderRadius: 24, padding: 20, width: 240, shadowColor: '#4b4944', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 32, elevation: 10 },
  seletorTitulo: { fontSize: 10, fontWeight: '700', color: '#904c1f', letterSpacing: 1.5, marginBottom: 14 },
  seletorItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, marginBottom: 6 },
  seletorItemAtivo: { backgroundColor: '#fff5f3' },
  seletorAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffdbc9', justifyContent: 'center', alignItems: 'center' },
  seletorAvatarAtivo: { backgroundColor: '#b22300' },
  seletorItemTexto: { flex: 1 },
  seletorItemNome: { fontSize: 14, fontWeight: '700', color: '#1b1c16' },
  seletorItemNomeAtivo: { color: '#b22300' },
  seletorItemIdade: { fontSize: 11, color: '#5e5c54' },
  adicionarBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(178,35,0,0.15)', borderStyle: 'dashed' },
  adicionarIcone: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff5f3', justifyContent: 'center', alignItems: 'center' },
  adicionarTexto: { fontSize: 14, fontWeight: '700', color: '#b22300' },
  trilhaContainer: { flex: 1, backgroundColor: '#fcf9ef' },
  trilhaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  trilhaHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  trilhaIconeCircle: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  trilhaSuper: { fontSize: 10, fontWeight: '700', color: '#904c1f', letterSpacing: 1.2, marginBottom: 2 },
  trilhaTitulo: { fontSize: 20, fontWeight: '800', color: '#1b1c16' },
  fecharBtnHeader: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eae8de', justifyContent: 'center', alignItems: 'center' },
  progressBarRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 12, marginBottom: 12 },
  progressBarTrack: { flex: 1, height: 10, backgroundColor: '#e4e3d9', borderRadius: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 10, backgroundColor: '#b22300' },
  progressBarLabel: { fontSize: 13, fontWeight: '800', color: '#b22300', minWidth: 32 },
  instrucao: { fontSize: 13, color: '#5e5c54', lineHeight: 20, marginHorizontal: 24, marginBottom: 16, backgroundColor: '#f6f4ea', borderRadius: 14, padding: 12 },
});