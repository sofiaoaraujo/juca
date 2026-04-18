import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
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
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// ─── Tipos ────────────────────────────────────────────────────────────────────
type SOSEtapa = {
  id: string;
  label: string;
  descricao: string;
  icon: string;
  dica: string;
};

type AlimentoSugerido = {
  id: string;
  name: string;
  icon: string;       // MaterialCommunityIcons name
  corFundo: string;
  corIcone: string;   // cor do círculo atrás do ícone
  motivo: string;
  categoria: string;
};

// ─── Etapas SOS Feeding ───────────────────────────────────────────────────────
const ETAPAS_SOS: SOSEtapa[] = [
  {
    id: 'tolerar',
    label: 'TOLERAR',
    descricao: 'O alimento está na mesa ou prato próximo',
    icon: 'eye-outline',
    dica: 'Coloque o alimento no prato sem forçar. Elogie só por olhar.',
  },
  {
    id: 'interagir',
    label: 'INTERAGIR',
    descricao: 'Tocar, explorar ou brincar com o alimento',
    icon: 'hand-wave-outline',
    dica: 'Permita exploração livre. Um dedo já é uma conquista!',
  },
  {
    id: 'cheirar',
    label: 'CHEIRAR',
    descricao: 'Aproximar o nariz e sentir o aroma',
    icon: 'emoticon-outline',
    dica: 'Transforme em brincadeira: "Que cheiro tem esse alimento?"',
  },
  {
    id: 'beijar',
    label: 'BEIJAR / LAMBER',
    descricao: 'Encostar os lábios ou dar uma lambida',
    icon: 'emoticon-kiss-outline',
    dica: 'Celebre qualquer contato com a boca, mesmo que pequenininho!',
  },
  {
    id: 'morder',
    label: 'MORDER',
    descricao: 'Dar uma mordida sem precisar engolir',
    icon: 'tooth-outline',
    dica: 'Tudo bem cuspir. O objetivo é o contato oral, não a ingestão.',
  },
  {
    id: 'comer',
    label: 'COMER',
    descricao: 'Mastigar e engolir o alimento',
    icon: 'check-circle-outline',
    dica: 'Grande conquista! Registre e compartilhe com o terapeuta.',
  },
];

// ─── Mock da API (substituir por fetch real) ──────────────────────────────────
// A API deve retornar 2 alimentos sugeridos com base no Food Chaining
const SUGESTOES_API: AlimentoSugerido[] = [
  {
    id: '1',
    name: 'Banana Amassada',
    icon: 'food-variant',
    corFundo: '#FFFDE7',
    corIcone: '#FFF9C4',
    motivo: 'Próximo passo natural da Banana inteira',
    categoria: 'Fruta',
  },
  {
    id: '2',
    name: 'Cenoura Cozida',
    icon: 'carrot',
    corFundo: '#FFF3E0',
    corIcone: '#FFE0B2',
    motivo: 'Textura macia, próxima do Chuchu aceito',
    categoria: 'Legume',
  },
];

export default function Home() {
  const [nomeFilho, setNomeFilho] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [sexoFilho, setSexoFilho] = useState('');
  const [alimentoAtivo, setAlimentoAtivo] = useState<AlimentoSugerido | null>(null);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [etapasConcluidas, setEtapasConcluidas] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@juca:nomeFilho').then(v => { if (v) setNomeFilho(v); });
    AsyncStorage.getItem('@juca:nomeUsuario').then(v => { if (v) setNomeUsuario(v); });
    AsyncStorage.getItem('@juca:sexoFilho').then(v => { if (v) setSexoFilho(v); });
  }, []);

  const abrirJornada = (alimento: AlimentoSugerido) => {
    setAlimentoAtivo(alimento);
    setEtapasConcluidas([]);
    setModalVisivel(true);
  };

  const fecharJornada = () => {
    setModalVisivel(false);
    setAlimentoAtivo(null);
    setEtapasConcluidas([]);
  };

  const toggleEtapa = (id: string) => {
    setEtapasConcluidas(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const salvarSessao = async () => {
    setSalvando(true);
    try {
      const sessao = {
        alimentoId: alimentoAtivo?.id,
        alimento: alimentoAtivo?.name,
        data: new Date().toISOString(),
        etapasConcluidas,
        totalEtapas: ETAPAS_SOS.length,
      };

      // ✅ Conectar à sua API aqui:
      // await fetch('https://sua-api.com/sessoes', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(sessao),
      // });

      console.log('Sessão salva:', sessao);
      fecharJornada();
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
    } finally {
      setSalvando(false);
    }
  };

  const progresso = etapasConcluidas.length;
  const porcentagem = (progresso / ETAPAS_SOS.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerTexto}>
            <Text style={styles.greeting}>
              {nomeUsuario ? `Olá, ${nomeUsuario}!` : 'Olá!'}
            </Text>
            <Text style={styles.titulo}>
              {nomeFilho
                ? `Jornada ${sexoFilho === 'Feminino' ? 'da' : 'do'} ${nomeFilho}`
                : 'Sua Jornada Hoje'}
            </Text>
          </View>
        </View>

        {/* ── Subtítulo ── */}
        <Text style={styles.subtitulo}>
          Escolha um alimento para continuar a{'\n'}exploração sensorial.
        </Text>

        {/* ── Badge método ── */}
        <View style={styles.badge}>
          <MaterialCommunityIcons name="link-variant" size={13} color="#904c1f" />
          <Text style={styles.badgeText}>Método Food Chaining</Text>
        </View>

        {/* ── Dois cards grandes lado a lado ── */}
        <View style={styles.cardsRow}>
          {SUGESTOES_API.map((alimento) => (
            <TouchableOpacity
              key={alimento.id}
              activeOpacity={0.75}
              style={[styles.foodCard, { backgroundColor: alimento.corFundo }]}
              onPress={() => abrirJornada(alimento)}
            >
              <Text style={styles.cardCategoria}>{alimento.categoria.toUpperCase()}</Text>

              <View style={[styles.iconeCircle, { backgroundColor: alimento.corIcone }]}>
                <MaterialCommunityIcons name={alimento.icon as any} size={44} color="#904c1f" />
              </View>

              <Text style={styles.cardNome}>{alimento.name}</Text>
              <Text style={styles.cardMotivo}>{alimento.motivo}</Text>

              <View style={styles.cardBotao}>
                <Text style={styles.cardBotaoText}>Iniciar</Text>
                <MaterialCommunityIcons name="arrow-right" size={13} color="#b22300" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Progresso semanal ── */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitulo}>Progresso da Semana</Text>
            <Text style={styles.progressContador}>3 / 5</Text>
          </View>
          <Text style={styles.progressSub}>sessões realizadas esta semana</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '60%' }]} />
          </View>
          <Text style={styles.progressMeta}>Meta: 5 sessões semanais</Text>
        </View>
      </ScrollView>

      {/* ── Modal Jornada Sensorial SOS ── */}
      <Modal
        visible={modalVisivel}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={fecharJornada}
      >
        <SafeAreaView style={styles.modalContainer}>

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={[
                styles.modalIconeCircle,
                { backgroundColor: alimentoAtivo?.corIcone ?? '#eee' }
              ]}>
                <MaterialCommunityIcons
                  name={(alimentoAtivo?.icon ?? 'food') as any}
                  size={28}
                  color="#904c1f"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalSuper}>JORNADA SENSORIAL · SOS</Text>
                <Text style={styles.modalTitulo} numberOfLines={1}>
                  {alimentoAtivo?.name}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.fecharBtn}
              onPress={fecharJornada}
            >
              <MaterialCommunityIcons name="close" size={20} color="#5e5c54" />
            </TouchableOpacity>
          </View>

          {/* Barra de progresso */}
          <View style={styles.progressBarRow}>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${porcentagem}%` }]} />
            </View>
            <Text style={styles.progressBarLabel}>{progresso}/{ETAPAS_SOS.length}</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScroll}
          >
            {/* Instrução */}
            <View style={styles.instrucaoBox}>
              <Text style={styles.instrucaoTexto}>
                🌱 Marque cada etapa que a criança conseguiu realizar hoje. Vá no ritmo dela — não há pressa!
              </Text>
            </View>

            {/* Etapas SOS */}
            {ETAPAS_SOS.map((etapa) => {
              const feita = etapasConcluidas.includes(etapa.id);
              return (
                <TouchableOpacity
                  key={etapa.id}
                  activeOpacity={0.75}
                  style={[styles.etapaCard, feita && styles.etapaCardFeita]}
                  onPress={() => toggleEtapa(etapa.id)}
                >
                  <View style={[styles.etapaIconeWrap, feita && styles.etapaIconeWrapFeito]}>
                    <MaterialCommunityIcons
                      name={feita ? 'check' : (etapa.icon as any)}
                      size={22}
                      color={feita ? '#fff' : '#904c1f'}
                    />
                  </View>

                  <View style={styles.etapaConteudo}>
                    <Text style={[styles.etapaLabel, feita && styles.etapaLabelFeita]}>
                      {etapa.label}
                    </Text>
                    <Text style={styles.etapaDescricao}>{etapa.descricao}</Text>
                    {feita && (
                      <View style={styles.dicaBox}>
                        <Text style={styles.dicaTexto}>💡 {etapa.dica}</Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.check, feita && styles.checkFeito]}>
                    {feita && (
                      <MaterialCommunityIcons name="check" size={13} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.salvarBtn,
                (etapasConcluidas.length === 0 || salvando) && styles.salvarBtnOff,
              ]}
              onPress={salvarSessao}
              disabled={etapasConcluidas.length === 0 || salvando}
            >
              <Text style={styles.salvarBtnText}>
                {salvando ? 'Salvando...' : 'Salvar Sessão de Hoje'}
              </Text>
              {!salvando && (
                <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
              )}
            </TouchableOpacity>
            <Text style={styles.rodapeTexto}>
              Os dados serão incluídos no relatório do terapeuta.
            </Text>
          </View>

        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf9ef' },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  headerTexto: { flex: 1 },
  greeting: { fontSize: 12, color: '#5e5c54', fontWeight: '500', marginBottom: 2 },
  titulo: { fontSize: 26, fontWeight: '800', color: '#1b1c16', letterSpacing: -0.5 },

  subtitulo: { fontSize: 16, color: '#904c1f', lineHeight: 24, marginBottom: 16 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffdbc9',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    marginBottom: 28,
  },
  badgeText: { fontSize: 12, color: '#904c1f', fontWeight: '700' },

  // Cards
  cardsRow: { flexDirection: 'row', gap: 16, marginBottom: 28 },
  foodCard: {
    flex: 1,
    borderRadius: 28,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#4b4944',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 32,
    elevation: 3,
  },
  cardCategoria: {
    fontSize: 10,
    fontWeight: '700',
    color: '#904c1f',
    letterSpacing: 1.5,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  iconeCircle: {
    width: (width - 112) / 2,
    aspectRatio: 1,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardNome: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1b1c16',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardMotivo: {
    fontSize: 11,
    color: '#5e5c54',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 14,
  },
  cardBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(178,35,0,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  cardBotaoText: { fontSize: 12, color: '#b22300', fontWeight: '700' },

  // Progresso semanal
  progressCard: { backgroundColor: '#f6f4ea', borderRadius: 24, padding: 24 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressTitulo: { fontSize: 16, fontWeight: '800', color: '#1b1c16' },
  progressContador: { fontSize: 20, fontWeight: '800', color: '#b22300' },
  progressSub: { fontSize: 13, color: '#5e5c54', marginBottom: 16 },
  progressTrack: {
    height: 12,
    backgroundColor: '#e4e3d9',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: { height: '100%', borderRadius: 12, backgroundColor: '#b22300' },
  progressMeta: { fontSize: 12, color: '#904c1f', fontWeight: '600' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#fcf9ef' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  modalIconeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSuper: {
    fontSize: 10,
    fontWeight: '700',
    color: '#904c1f',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  modalTitulo: { fontSize: 21, fontWeight: '800', color: '#1b1c16' },
  fecharBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eae8de',
    justifyContent: 'center',
    alignItems: 'center',
  },

  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 8,
  },
  progressBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#e4e3d9',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 10, backgroundColor: '#b22300' },
  progressBarLabel: { fontSize: 13, fontWeight: '800', color: '#b22300', minWidth: 32 },

  modalScroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  instrucaoBox: { backgroundColor: '#f6f4ea', borderRadius: 18, padding: 16, marginBottom: 20 },
  instrucaoTexto: { fontSize: 14, color: '#5e5c54', lineHeight: 22 },

  // Etapas
  etapaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#4b4944',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  etapaCardFeita: { borderColor: '#b22300', backgroundColor: '#fff8f7' },
  etapaIconeWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ffdbc9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  etapaIconeWrapFeito: { backgroundColor: '#b22300' },
  etapaConteudo: { flex: 1 },
  etapaLabel: { fontSize: 10, fontWeight: '700', color: '#5e5c54', letterSpacing: 1.2, marginBottom: 3 },
  etapaLabelFeita: { color: '#b22300' },
  etapaDescricao: { fontSize: 14, fontWeight: '600', color: '#1b1c16', lineHeight: 20 },
  dicaBox: { backgroundColor: '#ffdbc9', borderRadius: 12, padding: 10, marginTop: 10 },
  dicaTexto: { fontSize: 12, color: '#904c1f', lineHeight: 18 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e4e3d9',
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkFeito: { backgroundColor: '#b22300', borderColor: '#b22300' },

  // Footer modal
  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    backgroundColor: '#fcf9ef',
  },
  salvarBtn: {
    backgroundColor: '#b22300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    borderRadius: 100,
    shadowColor: '#b22300',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  salvarBtnOff: { opacity: 0.3 },
  salvarBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  rodapeTexto: { textAlign: 'center', fontSize: 12, color: '#5e5c54', marginTop: 12, lineHeight: 18 },
});