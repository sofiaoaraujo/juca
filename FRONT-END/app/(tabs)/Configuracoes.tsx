import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFilhos, type Filho } from '../../context/FilhosContext';

export default function Configuracoes() {
  const router = useRouter();
  const { filhos, filhoAtivo, setFilhoAtivo, editarFilho, removerFilho } = useFilhos();

  const [filhoEditando, setFilhoEditando] = useState<Filho | null>(null);
  const [modalEditar, setModalEditar] = useState(false);
  const [alergias, setAlergias] = useState('');
  const [neuro, setNeuro] = useState('');
  const [confirmandoNome, setConfirmandoNome] = useState('');
  const [modalExcluir, setModalExcluir] = useState(false);
  const [filhoExcluindo, setFilhoExcluindo] = useState<Filho | null>(null);

  const abrirEditar = (filho: Filho) => {
    setFilhoEditando(filho);
    setAlergias(filho.alergias ?? '');
    setNeuro(filho.neuro ?? '');
    setModalEditar(true);
  };

  const salvarEdicao = async () => {
    if (!filhoEditando) return;
    await editarFilho(filhoEditando.id, { alergias, neuro });
    setModalEditar(false);
    setFilhoEditando(null);
  };

  const abrirExcluir = (filho: Filho) => {
    setFilhoExcluindo(filho);
    setConfirmandoNome('');
    setModalExcluir(true);
  };

  const confirmarExclusao = async () => {
    if (!filhoExcluindo) return;
    if (confirmandoNome.trim().toLowerCase() !== filhoExcluindo.nome.trim().toLowerCase()) {
      Alert.alert('Nome incorreto', 'Digite o nome exato da criança para confirmar.');
      return;
    }
    await removerFilho(filhoExcluindo.id);
    setModalExcluir(false);
    setFilhoExcluindo(null);
  };

  const calcularIdade = (dataNasc: string): string => {
    if (!dataNasc || dataNasc.length < 10) return '';
    const [dia, mes, ano] = dataNasc.split('/');
    const nasc = new Date(`${ano}-${mes}-${dia}`);
    const hoje = new Date();
    const meses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth());
    if (meses < 24) return `${meses} meses`;
    const anos = Math.floor(meses / 12);
    const mesesRest = meses % 12;
    return mesesRest > 0 ? `${anos} anos e ${mesesRest} meses` : `${anos} anos`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerSuper}>CONFIGURAÇÕES</Text>
          <Text style={styles.headerTitulo}>Perfil e Filhos</Text>
        </View>

        {/* ── Seção de filhos ── */}
        <Text style={styles.secaoTitulo}>FILHOS CADASTRADOS</Text>

        {filhos.map(filho => {
          const ativo = filhoAtivo?.id === filho.id;
          const artigo = filho.sexo === 'Feminino' ? 'da' : 'do';
          const idade = calcularIdade(filho.dataNasc);
          return (
            <View key={filho.id} style={[styles.filhoCard, ativo && styles.filhoCardAtivo]}>

              {/* Avatar + info */}
              <View style={styles.filhoHeader}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[styles.filhoAvatar, ativo && styles.filhoAvatarAtivo]}
                  onPress={() => setFilhoAtivo(filho)}
                >
                  <MaterialCommunityIcons
                    name={filho.sexo === 'Feminino' ? 'human-female' : 'human-male'}
                    size={26}
                    color={ativo ? '#fff' : '#904c1f'}
                  />
                </TouchableOpacity>

                <View style={styles.filhoInfo}>
                  <View style={styles.filhoNomeRow}>
                    <Text style={styles.filhoNome}>{filho.nome}</Text>
                    {ativo && (
                      <View style={styles.ativoBadge}>
                        <Text style={styles.ativoBadgeText}>ATIVO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.filhoDetalhe}>
                    {filho.sexo} · {idade || filho.dataNasc}
                  </Text>
                  {filho.alergias ? (
                    <Text style={styles.filhoAlergia}>⚠ {filho.alergias}</Text>
                  ) : null}
                  {filho.neuro ? (
                    <Text style={styles.filhoNeuro}>🧠 {filho.neuro}</Text>
                  ) : null}
                </View>
              </View>

              {/* Ações */}
              <View style={styles.filhoAcoes}>
                {!ativo && (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles.acaoBtn}
                    onPress={() => setFilhoAtivo(filho)}
                  >
                    <MaterialCommunityIcons name="swap-horizontal" size={16} color="#904c1f" />
                    <Text style={styles.acaoBtnText}>Tornar ativo</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={styles.acaoBtn}
                  onPress={() => abrirEditar(filho)}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={16} color="#904c1f" />
                  <Text style={styles.acaoBtnText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[styles.acaoBtn, styles.acaoBtnPerigo]}
                  onPress={() => abrirExcluir(filho)}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color="#b22300" />
                  <Text style={styles.acaoBtnTextPerigo}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* ── Adicionar novo filho ── */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.adicionarCard}
          onPress={() => router.push('/onboarding-filho')}
        >
          <View style={styles.adicionarIcone}>
            <MaterialCommunityIcons name="plus" size={24} color="#b22300" />
          </View>
          <View style={styles.adicionarTexto}>
            <Text style={styles.adicionarTitulo}>Adicionar novo filho</Text>
            <Text style={styles.adicionarSub}>Abre o questionário completo</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#c4c2b8" />
        </TouchableOpacity>

        {/* ── Sobre o app ── */}
        <Text style={[styles.secaoTitulo, { marginTop: 32 }]}>SOBRE O APP</Text>
        <View style={styles.sobreCard}>
          <ItemMenu icone="information-outline" texto="Versão 1.0.0 (MVP)" onPress={() => {}} semSeta />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal Editar filho ── */}
      <Modal
        visible={modalEditar}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalEditar(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalSuper}>EDITAR INFORMAÇÕES</Text>
              <Text style={styles.modalTitulo}>{filhoEditando?.nome}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.fecharBtn}
              onPress={() => setModalEditar(false)}
            >
              <MaterialCommunityIcons name="close" size={20} color="#5e5c54" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalInfo}>
              Aqui você pode atualizar as informações de saúde. Para editar nome, data ou sexo, entre em contato com o suporte.
            </Text>

            <Text style={styles.inputLabel}>ALERGIAS / RESTRIÇÕES (OPCIONAL)</Text>
            <View style={styles.inputBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#b22300" />
              <TextInput
                style={styles.input}
                placeholder="Ex: Amendoim, Lactose..."
                placeholderTextColor="#5e5c5480"
                value={alergias}
                onChangeText={setAlergias}
                multiline
              />
            </View>

            <Text style={styles.inputLabel}>NEURODIVERGÊNCIA (OPCIONAL)</Text>
            <View style={styles.inputBox}>
              <MaterialCommunityIcons name="brain" size={18} color="#904c1f" />
              <TextInput
                style={styles.input}
                placeholder="Ex: Autismo Nível 1, TDAH..."
                placeholderTextColor="#5e5c5480"
                value={neuro}
                onChangeText={setNeuro}
                multiline
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.salvarBtn}
              onPress={salvarEdicao}
            >
              <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" />
              <Text style={styles.salvarBtnText}>Salvar Alterações</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Modal Excluir filho ── */}
      <Modal
        visible={modalExcluir}
        animationType="fade"
        transparent
        onRequestClose={() => setModalExcluir(false)}
      >
        <View style={styles.overlayExcluir}>
          <View style={styles.excluirModal}>
            <View style={styles.excluirIcone}>
              <MaterialCommunityIcons name="trash-can-outline" size={28} color="#b22300" />
            </View>
            <Text style={styles.excluirTitulo}>Excluir {filhoExcluindo?.nome}?</Text>
            <Text style={styles.excluirAviso}>
              Todo o histórico de sessões será perdido permanentemente. Esta ação não pode ser desfeita.
            </Text>
            <Text style={styles.excluirInstrucao}>
              Digite <Text style={{ fontWeight: '800', color: '#1b1c16' }}>{filhoExcluindo?.nome}</Text> para confirmar:
            </Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder={filhoExcluindo?.nome}
                placeholderTextColor="#5e5c5480"
                value={confirmandoNome}
                onChangeText={setConfirmandoNome}
                autoFocus
              />
            </View>
            <View style={styles.excluirBotoes}>
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.cancelarBtn}
                onPress={() => setModalExcluir(false)}
              >
                <Text style={styles.cancelarBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                style={[
                  styles.excluirBtn,
                  confirmandoNome.trim().toLowerCase() !== filhoExcluindo?.nome.trim().toLowerCase() && styles.excluirBtnOff,
                ]}
                onPress={confirmarExclusao}
              >
                <Text style={styles.excluirBtnText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Componente auxiliar ──────────────────────────────────────────────────────
function ItemMenu({ icone, texto, onPress, semSeta }: {
  icone: string;
  texto: string;
  onPress: () => void;
  semSeta?: boolean;
}) {
  return (
    <TouchableOpacity activeOpacity={0.75} style={styles.menuItem} onPress={onPress}>
      <MaterialCommunityIcons name={icone as any} size={20} color="#904c1f" />
      <Text style={styles.menuItemTexto}>{texto}</Text>
      {!semSeta && <MaterialCommunityIcons name="chevron-right" size={18} color="#c4c2b8" />}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf9ef' },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

  header: { marginBottom: 28 },
  headerSuper: { fontSize: 11, fontWeight: '700', color: '#904c1f', letterSpacing: 1.5, marginBottom: 4 },
  headerTitulo: { fontSize: 30, fontWeight: '800', color: '#1b1c16', letterSpacing: -0.5 },

  secaoTitulo: { fontSize: 11, fontWeight: '700', color: '#904c1f', letterSpacing: 1.5, marginBottom: 14 },

  // Card de filho
  filhoCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 14, shadowColor: '#4b4944', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, borderWidth: 2, borderColor: 'transparent' },
  filhoCardAtivo: { borderColor: '#b22300' },
  filhoHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  filhoAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#ffdbc9', justifyContent: 'center', alignItems: 'center' },
  filhoAvatarAtivo: { backgroundColor: '#b22300' },
  filhoInfo: { flex: 1 },
  filhoNomeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  filhoNome: { fontSize: 18, fontWeight: '800', color: '#1b1c16' },
  ativoBadge: { backgroundColor: '#b22300', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  ativoBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  filhoDetalhe: { fontSize: 13, color: '#5e5c54', marginBottom: 4 },
  filhoAlergia: { fontSize: 12, color: '#b22300', fontWeight: '600', marginTop: 2 },
  filhoNeuro: { fontSize: 12, color: '#904c1f', fontWeight: '600', marginTop: 2 },
  filhoAcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  acaoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f6f4ea', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100 },
  acaoBtnPerigo: { backgroundColor: '#fff5f3' },
  acaoBtnText: { fontSize: 12, color: '#904c1f', fontWeight: '700' },
  acaoBtnTextPerigo: { fontSize: 12, color: '#b22300', fontWeight: '700' },

  // Adicionar filho
  adicionarCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: 'rgba(178,35,0,0.15)', borderStyle: 'dashed' },
  adicionarIcone: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff5f3', justifyContent: 'center', alignItems: 'center' },
  adicionarTexto: { flex: 1 },
  adicionarTitulo: { fontSize: 15, fontWeight: '700', color: '#b22300' },
  adicionarSub: { fontSize: 12, color: '#5e5c54', marginTop: 2 },

  // Sobre
  sobreCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#4b4944', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderBottomWidth: 1, borderBottomColor: '#f6f4ea' },
  menuItemTexto: { flex: 1, fontSize: 15, color: '#1b1c16', fontWeight: '500' },

  // Modal editar
  modalContainer: { flex: 1, backgroundColor: '#fcf9ef' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  modalSuper: { fontSize: 10, fontWeight: '700', color: '#904c1f', letterSpacing: 1.2, marginBottom: 4 },
  modalTitulo: { fontSize: 24, fontWeight: '800', color: '#1b1c16' },
  fecharBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eae8de', justifyContent: 'center', alignItems: 'center' },
  modalScroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 },
  modalInfo: { fontSize: 13, color: '#5e5c54', lineHeight: 20, backgroundColor: '#f6f4ea', borderRadius: 16, padding: 14, marginBottom: 24 },
  inputLabel: { fontSize: 10, fontWeight: '700', color: '#904c1f', letterSpacing: 1.2, marginBottom: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#eae8de', borderRadius: 16, padding: 16, marginBottom: 20 },
  input: { flex: 1, fontSize: 15, color: '#1b1c16', fontWeight: '500' },
  modalFooter: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 32 : 20 },
  salvarBtn: { backgroundColor: '#b22300', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20, borderRadius: 100, elevation: 4, shadowColor: '#b22300', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
  salvarBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Modal excluir
  overlayExcluir: { flex: 1, backgroundColor: 'rgba(27,28,22,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  excluirModal: { backgroundColor: '#fff', borderRadius: 28, padding: 28, width: '100%' },
  excluirIcone: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff5f3', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  excluirTitulo: { fontSize: 20, fontWeight: '800', color: '#1b1c16', marginBottom: 10 },
  excluirAviso: { fontSize: 14, color: '#5e5c54', lineHeight: 22, marginBottom: 20 },
  excluirInstrucao: { fontSize: 13, color: '#5e5c54', marginBottom: 10 },
  excluirBotoes: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelarBtn: { flex: 1, padding: 16, borderRadius: 100, backgroundColor: '#f6f4ea', alignItems: 'center' },
  cancelarBtnText: { fontSize: 15, fontWeight: '700', color: '#5e5c54' },
  excluirBtn: { flex: 1, padding: 16, borderRadius: 100, backgroundColor: '#b22300', alignItems: 'center' },
  excluirBtnOff: { opacity: 0.35 },
  excluirBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});