import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFilhos } from '../../context/FilhosContext';
import api from '../../services/api';

const { width } = Dimensions.get('window');
const PADDING = 24;
const CARD_WIDTH = width - PADDING * 2;
const IMAGE_HEIGHT = CARD_WIDTH * 0.72;

type ConquistaFoto = {
  id: string;
  foto_url: string;
  created_at: string;
  alimentos: { nome: string } | null;
};

const formatarDataCompleta = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

export default function Galeria() {
  const { filhoAtivo } = useFilhos();
  const [fotos, setFotos] = useState<ConquistaFoto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState<ConquistaFoto | null>(null);
  const [buscaAtiva, setBuscaAtiva] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      if (!filhoAtivo?.id) return;
      setCarregando(true);
      api
        .get<ConquistaFoto[]>(`/progresso/crianca/${filhoAtivo.id}/galeria`)
        .then(({ data }) => setFotos(data ?? []))
        .catch(e => console.error('Erro ao carregar galeria:', e))
        .finally(() => setCarregando(false));
    }, [filhoAtivo?.id]),
  );

  const pronome = filhoAtivo?.sexo === 'Feminino' ? 'a' : 'o';

  const fotosFiltradas = useMemo(() => {
    if (!termoBusca.trim()) return fotos;
    const termo = termoBusca.toLowerCase().trim();
    return fotos.filter(f =>
      (f.alimentos?.nome ?? 'Alimento').toLowerCase().includes(termo),
    );
  }, [fotos, termoBusca]);

  const toggleBusca = () => {
    if (buscaAtiva) {
      setBuscaAtiva(false);
      setTermoBusca('');
    } else {
      setBuscaAtiva(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        {buscaAtiva ? (
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color="#904c1f" />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Buscar alimento…"
              placeholderTextColor="#b0ae9f"
              value={termoBusca}
              onChangeText={setTermoBusca}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {termoBusca.length > 0 && (
              <TouchableOpacity onPress={() => setTermoBusca('')} activeOpacity={0.7}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#b0ae9f" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <TouchableOpacity activeOpacity={0.7} style={styles.iconBtn} onPress={toggleBusca}>
          <MaterialCommunityIcons
            name={buscaAtiva ? 'close' : 'magnify'}
            size={22}
            color="#1b1c16"
          />
        </TouchableOpacity>
      </View>

      {/* Título da seção */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitulo}>Galeria de Conquistas</Text>
        {filhoAtivo?.nome ? (
          <Text style={styles.sectionDesc}>
            Veja o quanto {pronome} {filhoAtivo.nome} já descobriu na sua Jornada de Sabores!
          </Text>
        ) : null}
      </View>

      {/* Conteúdo */}
      {carregando ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#b22300" />
          <Text style={styles.loadingText}>Carregando conquistas...</Text>
        </View>
      ) : fotos.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emptyIcone}>
            <MaterialCommunityIcons name="image-off-outline" size={52} color="#c4c2b8" />
          </View>
          <Text style={styles.emptyTitulo}>Nenhuma conquista ainda</Text>
          <Text style={styles.emptyDesc}>
            Quando completar a etapa{' '}
            <Text style={{ fontWeight: '800', color: '#b22300' }}>Comer</Text>
            {' '}com foto na trilha sensorial, as imagens aparecerão aqui!
          </Text>
          <View style={styles.emptyDica}>
            <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#904c1f" />
            <Text style={styles.emptyDicaText}>
              Acesse a aba <Text style={{ fontWeight: '700' }}>Home</Text> e inicie uma trilha.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={fotosFiltradas}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.card}
              onPress={() => setFotoAmpliada(item)}
            >
              {/* Imagem principal */}
              <View style={styles.imageFrame}>
                <Image
                  source={{ uri: item.foto_url }}
                  style={styles.cardImagem}
                  resizeMode="cover"
                />
              </View>

              {/* Badge SUCESSO */}
              <View style={styles.sucessoBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#fff" />
                <Text style={styles.sucessoText}>SUCESSO</Text>
              </View>

              {/* Rodapé do card */}
              <View style={styles.cardFooter}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardNome} numberOfLines={1}>
                    {item.alimentos?.nome ?? 'Alimento'}
                  </Text>
                  <Text style={styles.cardData}>{formatarDataCompleta(item.created_at)}</Text>
                </View>
                <View style={styles.alimentoIcone}>
                  <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal foto ampliada */}
      {fotoAmpliada && (
        <Modal
          visible
          animationType="fade"
          transparent
          onRequestClose={() => setFotoAmpliada(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setFotoAmpliada(null)}
            />
            <View style={styles.modalCard}>
              <Image
                source={{ uri: fotoAmpliada.foto_url }}
                style={styles.modalImagem}
                resizeMode="cover"
              />
              <View style={styles.modalInfo}>
                <View style={styles.modalBadge}>
                  <MaterialCommunityIcons name="check-circle" size={14} color="#fff" />
                  <Text style={styles.modalBadgeText}>SUCESSO</Text>
                </View>
                <Text style={styles.modalNome}>
                  {fotoAmpliada.alimentos?.nome ?? 'Alimento'}
                </Text>
                <Text style={styles.modalData}>
                  {formatarDataCompleta(fotoAmpliada.created_at)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalFecharBtn}
                activeOpacity={0.8}
                onPress={() => setFotoAmpliada(null)}
              >
                <MaterialCommunityIcons name="close" size={20} color="#5e5c54" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf9ef' },

  // ─── Topbar ───────────────────────────────────────────────────────────────
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    paddingTop: 2,
    paddingBottom: 2,
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0eee4',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1b1c16',
    paddingVertical: 0,
  },

  // ─── Cabeçalho da seção ────────────────────────────────────────────────────
  sectionHeader: {
    paddingHorizontal: PADDING,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 4,
  },
  sectionTitulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#b22300',
    letterSpacing: -0.3,
  },
  sectionDesc: {
    fontSize: 15,
    color: '#1b1c16',
    lineHeight: 22,
  },

  // ─── Loading ───────────────────────────────────────────────────────────────
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 60,
  },
  loadingText: { fontSize: 14, color: '#904c1f', fontWeight: '600' },

  // ─── Empty state ───────────────────────────────────────────────────────────
  emptyScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIcone: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f0eee4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1b1c16',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 15,
    color: '#5e5c54',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  emptyDica: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ffdbc9',
    borderRadius: 16,
    padding: 14,
    width: '100%',
  },
  emptyDicaText: { flex: 1, fontSize: 13, color: '#904c1f', lineHeight: 20 },

  // ─── Lista ────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: PADDING,
    paddingBottom: 40,
  },

  // ─── Card ────────────────────────────────────────────────────────────────
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: '#4b4944',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    overflow: 'visible',
  },

  imageFrame: {
    margin: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8e6dc',
    height: IMAGE_HEIGHT,
    backgroundColor: '#f6f4ea',
  },
  cardImagem: {
    width: '100%',
    height: '100%',
  },

  sucessoBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#b22300',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    shadowColor: '#b22300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sucessoText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.8,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardNome: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1b1c16',
    letterSpacing: -0.3,
  },
  cardData: {
    fontSize: 13,
    color: '#5e5c54',
    fontWeight: '500',
  },
  alimentoIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8834A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E8834A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },

  // ─── Modal ───────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27,28,22,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: PADDING,
  },
  modalCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  modalImagem: { width: '100%', height: width - PADDING * 2 },
  modalInfo: { padding: 20, gap: 6 },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#b22300',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    marginBottom: 6,
  },
  modalBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },
  modalNome: { fontSize: 22, fontWeight: '800', color: '#1b1c16' },
  modalData: { fontSize: 13, color: '#5e5c54' },
  modalFecharBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(240,238,228,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
