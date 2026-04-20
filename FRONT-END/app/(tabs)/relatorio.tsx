import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFilhos } from '../../context/FilhosContext';

const { width } = Dimensions.get('window');

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Sessao = {
  id: string;
  alimento: string;
  categoria: string;
  textura: string; // 'macio' | 'firme' | 'crocante'
  cor: string;
  data: string;
  etapasConcluidas: string[];
  totalEtapas: number;
};

type Padrao = {
  icone: string;
  titulo: string;
  descricao: string;
  nivel: 'positivo' | 'neutro' | 'atencao';
};

// ─── Mock de sessões ──────────────────────────────────────────────────────────
const SESSOES_MOCK: Sessao[] = [
  {
    id: '1',
    alimento: 'Banana Amassada',
    categoria: 'Fruta',
    textura: 'macio',
    cor: 'amarelo',
    data: '2026-04-18T10:00:00',
    etapasConcluidas: ['tolerar', 'interagir', 'cheirar'],
    totalEtapas: 6,
  },
  {
    id: '2',
    alimento: 'Cenoura Cozida',
    categoria: 'Legume',
    textura: 'macio',
    cor: 'laranja',
    data: '2026-04-17T09:30:00',
    etapasConcluidas: ['tolerar', 'interagir'],
    totalEtapas: 6,
  },
  {
    id: '3',
    alimento: 'Banana Amassada',
    categoria: 'Fruta',
    textura: 'macio',
    cor: 'amarelo',
    data: '2026-04-16T11:00:00',
    etapasConcluidas: ['tolerar', 'interagir', 'cheirar', 'beijar'],
    totalEtapas: 6,
  },
  {
    id: '4',
    alimento: 'Arroz',
    categoria: 'Carboidrato',
    textura: 'macio',
    cor: 'branco',
    data: '2026-04-15T10:30:00',
    etapasConcluidas: ['tolerar'],
    totalEtapas: 6,
  },
];

const ETAPAS_LABELS: Record<string, string> = {
  tolerar: 'Tolerar',
  interagir: 'Interagir',
  cheirar: 'Cheirar',
  beijar: 'Beijar/Lamber',
  morder: 'Morder',
  comer: 'Comer',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const calcularIdade = (dataNasc: string): string => {
  if (!dataNasc || dataNasc.length < 10) return '';
  const [dia, mes, ano] = dataNasc.split('/');
  const nasc = new Date(`${ano}-${mes}-${dia}`);
  const hoje = new Date();
  const meses =
    (hoje.getFullYear() - nasc.getFullYear()) * 12 +
    (hoje.getMonth() - nasc.getMonth());
  if (meses < 24) return `${meses} meses`;
  const anos = Math.floor(meses / 12);
  const mesesRest = meses % 12;
  return mesesRest > 0 ? `${anos} anos e ${mesesRest} meses` : `${anos} anos`;
};

const formatarData = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const progresso = (etapas: string[], total: number) =>
  Math.round((etapas.length / total) * 100);

// ─── Detecção de padrões ──────────────────────────────────────────────────────
const detectarPadroes = (sessoes: Sessao[]): Padrao[] => {
  const padroes: Padrao[] = [];
  if (sessoes.length === 0) return padroes;

  // Padrão de textura
  const texturas: Record<string, number[]> = {};
  sessoes.forEach(s => {
    if (!texturas[s.textura]) texturas[s.textura] = [];
    texturas[s.textura].push(s.etapasConcluidas.length);
  });
  const mediasPorTextura = Object.entries(texturas).map(([tex, vals]) => ({
    textura: tex,
    media: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));
  const melhorTextura = mediasPorTextura.sort((a, b) => b.media - a.media)[0];
  if (melhorTextura) {
    padroes.push({
      icone: 'hand-wave-outline',
      titulo: `Prefere alimentos ${melhorTextura.textura}s`,
      descricao: `A criança avança mais etapas com texturas ${melhorTextura.textura}s. Priorize essa consistência nas próximas sessões.`,
      nivel: 'positivo',
    });
  }

  // Padrão de cor
  const cores: Record<string, number[]> = {};
  sessoes.forEach(s => {
    if (!cores[s.cor]) cores[s.cor] = [];
    cores[s.cor].push(s.etapasConcluidas.length);
  });
  const mediasPorCor = Object.entries(cores).map(([cor, vals]) => ({
    cor,
    media: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));
  const melhorCor = mediasPorCor.sort((a, b) => b.media - a.media)[0];
  if (melhorCor && mediasPorCor.length > 1) {
    padroes.push({
      icone: 'palette-outline',
      titulo: `Mais receptiva a alimentos ${melhorCor.cor}s`,
      descricao: `Alimentos de cor ${melhorCor.cor} tiveram melhor aceitação. Pode ser um ponto de entrada para novos alimentos.`,
      nivel: 'positivo',
    });
  }

  // Padrão de categoria
  const categorias: Record<string, number[]> = {};
  sessoes.forEach(s => {
    if (!categorias[s.categoria]) categorias[s.categoria] = [];
    categorias[s.categoria].push(s.etapasConcluidas.length);
  });
  const mediasPorCategoria = Object.entries(categorias).map(([cat, vals]) => ({
    categoria: cat,
    media: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));
  const melhorCategoria = mediasPorCategoria.sort((a, b) => b.media - a.media)[0];
  const piorCategoria = mediasPorCategoria[mediasPorCategoria.length - 1];
  if (melhorCategoria && mediasPorCategoria.length > 1) {
    padroes.push({
      icone: 'food-apple',
      titulo: `${melhorCategoria.categoria}s têm melhor aceitação`,
      descricao: `A categoria ${melhorCategoria.categoria} apresenta o maior progresso médio por sessão.`,
      nivel: 'positivo',
    });
  }
  if (piorCategoria && piorCategoria.categoria !== melhorCategoria?.categoria) {
    padroes.push({
      icone: 'alert-circle-outline',
      titulo: `${piorCategoria.categoria}s precisam de atenção`,
      descricao: `${piorCategoria.categoria}s apresentam menor progresso. Sugerimos introduzi-los gradualmente após consolidar os avanços com ${melhorCategoria?.categoria}s.`,
      nivel: 'atencao',
    });
  }

  // Padrão de evolução
  if (sessoes.length >= 2) {
    const ordenadas = [...sessoes].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
    );
    const primeiraMeta = progresso(ordenadas[0].etapasConcluidas, ordenadas[0].totalEtapas);
    const ultimaMeta = progresso(
      ordenadas[ordenadas.length - 1].etapasConcluidas,
      ordenadas[ordenadas.length - 1].totalEtapas
    );
    if (ultimaMeta > primeiraMeta) {
      padroes.push({
        icone: 'trending-up',
        titulo: 'Evolução positiva ao longo do tempo',
        descricao: `O progresso médio aumentou de ${primeiraMeta}% para ${ultimaMeta}% entre a primeira e a última sessão registrada.`,
        nivel: 'positivo',
      });
    }
  }

  return padroes;
};

// ─── Gerador de HTML para PDF ─────────────────────────────────────────────────
const gerarHTML = (
  nomeFilho: string,
  nomeUsuario: string,
  sexoFilho: string,
  idade: string,
  alergias: string,
  neuro: string,
  sessoes: Sessao[],
  padroes: Padrao[],
  mediaProgresso: number,
  alimentosUnicos: string[],
) => {
  const artigo = sexoFilho === 'Feminino' ? 'da' : 'do';
  const hoje = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const sessoesHTML = sessoes.map(s => {
    const pct = progresso(s.etapasConcluidas, s.totalEtapas);
    const etapasHTML = Object.keys(ETAPAS_LABELS).map(id => {
      const feita = s.etapasConcluidas.includes(id);
      return `<span style="
        display:inline-block;
        padding:3px 10px;
        border-radius:100px;
        font-size:11px;
        font-weight:600;
        margin:2px;
        background:${feita ? '#b22300' : '#f0eee4'};
        color:${feita ? '#fff' : '#5e5c54'};
      ">${ETAPAS_LABELS[id]}</span>`;
    }).join('');

    return `
      <div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:10px;border:1px solid #f0eee4;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div>
            <div style="font-size:15px;font-weight:700;color:#1b1c16;">${s.alimento}</div>
            <div style="font-size:12px;color:#5e5c54;">${formatarData(s.data)}</div>
          </div>
          <div style="
            background:${pct >= 80 ? '#b22300' : pct >= 50 ? '#ffdbc9' : '#f6f4ea'};
            color:${pct >= 50 ? (pct >= 80 ? '#fff' : '#904c1f') : '#5e5c54'};
            padding:4px 12px;border-radius:100px;font-size:13px;font-weight:800;
          ">${pct}%</div>
        </div>
        <div>${etapasHTML}</div>
      </div>
    `;
  }).join('');

  const padroesHTML = padroes.map(p => `
    <div style="
      background:${p.nivel === 'positivo' ? '#f6f4ea' : '#fff5f3'};
      border-radius:14px;padding:14px;margin-bottom:10px;
      border-left:4px solid ${p.nivel === 'positivo' ? '#b22300' : '#904c1f'};
    ">
      <div style="font-size:14px;font-weight:700;color:#1b1c16;margin-bottom:4px;">${p.titulo}</div>
      <div style="font-size:12px;color:#5e5c54;line-height:1.6;">${p.descricao}</div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, sans-serif; background: #fcf9ef; color: #1b1c16; padding: 32px; }
      </style>
    </head>
    <body>
      <!-- Cabeçalho -->
      <div style="border-bottom:2px solid #ffdbc9;padding-bottom:20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:#904c1f;letter-spacing:1.5px;margin-bottom:6px;">
          RELATÓRIO DE INTRODUÇÃO ALIMENTAR
        </div>
        <div style="font-size:28px;font-weight:800;color:#1b1c16;margin-bottom:4px;">
          Jornada ${artigo} ${nomeFilho}
        </div>
        <div style="font-size:13px;color:#5e5c54;">Gerado em ${hoje} · App Juca</div>
      </div>

      <!-- Dados da criança -->
      <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:#904c1f;letter-spacing:1.5px;margin-bottom:14px;">
          DADOS DA CRIANÇA
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <div style="font-size:11px;color:#5e5c54;margin-bottom:2px;">Nome</div>
            <div style="font-size:14px;font-weight:700;">${nomeFilho}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#5e5c54;margin-bottom:2px;">Idade</div>
            <div style="font-size:14px;font-weight:700;">${idade || '—'}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#5e5c54;margin-bottom:2px;">Responsável</div>
            <div style="font-size:14px;font-weight:700;">${nomeUsuario}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#5e5c54;margin-bottom:2px;">Sexo</div>
            <div style="font-size:14px;font-weight:700;">${sexoFilho || '—'}</div>
          </div>
          ${alergias ? `
          <div style="grid-column:span 2;">
            <div style="font-size:11px;color:#5e5c54;margin-bottom:2px;">Alergias / Restrições</div>
            <div style="font-size:14px;font-weight:700;color:#b22300;">${alergias}</div>
          </div>` : ''}
          ${neuro ? `
          <div style="grid-column:span 2;">
            <div style="font-size:11px;color:#5e5c54;margin-bottom:2px;">Neurodivergência</div>
            <div style="font-size:14px;font-weight:700;">${neuro}</div>
          </div>` : ''}
        </div>
      </div>

      <!-- Estatísticas -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">
        <div style="background:#f6f4ea;border-radius:14px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#b22300;">${sessoes.length}</div>
          <div style="font-size:10px;font-weight:700;color:#5e5c54;letter-spacing:1px;">SESSÕES</div>
        </div>
        <div style="background:#f6f4ea;border-radius:14px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#b22300;">${mediaProgresso}%</div>
          <div style="font-size:10px;font-weight:700;color:#5e5c54;letter-spacing:1px;">PROGRESSO MÉDIO</div>
        </div>
        <div style="background:#f6f4ea;border-radius:14px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#b22300;">${alimentosUnicos.length}</div>
          <div style="font-size:10px;font-weight:700;color:#5e5c54;letter-spacing:1px;">ALIMENTOS</div>
        </div>
      </div>

      <!-- Padrões detectados -->
      ${padroes.length > 0 ? `
      <div style="margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:#904c1f;letter-spacing:1.5px;margin-bottom:14px;">
          PADRÕES DETECTADOS
        </div>
        ${padroesHTML}
      </div>` : ''}

      <!-- Histórico -->
      <div style="margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:#904c1f;letter-spacing:1.5px;margin-bottom:14px;">
          HISTÓRICO DE SESSÕES
        </div>
        ${sessoesHTML}
      </div>

      <!-- Rodapé -->
      <div style="border-top:1px solid #e4e3d9;padding-top:16px;margin-top:8px;">
        <div style="font-size:12px;color:#5e5c54;line-height:1.8;">
          <strong>Método:</strong> Food Chaining + SOS Feeding (Sequential Oral Sensory)<br/>
          <strong>App:</strong> Juca — Introdução Alimentar Sensorial<br/>
          <strong>Observação:</strong> Este relatório é complementar ao acompanhamento terapêutico profissional.
        </div>
      </div>
    </body>
    </html>
  `;
};

// ─── Componente ───────────────────────────────────────────────────────────────
export default function Relatorio() {
  const { filhoAtivo } = useFilhos();
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [sessoes] = useState<Sessao[]>(SESSOES_MOCK);
  const [gerandoPDF, setGerandoPDF] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@juca:nomeUsuario').then(v => { if (v) setNomeUsuario(v); });
  }, []);

  // Dados vêm do filho ativo — trocam automaticamente ao mudar de filho
  const nomeFilho = filhoAtivo?.nome ?? '';
  const sexoFilho = filhoAtivo?.sexo ?? '';
  const dataNasc = filhoAtivo?.dataNasc ?? '';
  const alergias = filhoAtivo?.alergias ?? '';
  const neuro = filhoAtivo?.neuro ?? '';

  const artigo = sexoFilho === 'Feminino' ? 'da' : 'do';
  const idade = calcularIdade(dataNasc);
  const totalSessoes = sessoes.length;
  const mediaProgresso = Math.round(
    sessoes.reduce((acc, s) => acc + progresso(s.etapasConcluidas, s.totalEtapas), 0) / totalSessoes
  );
  const alimentosUnicos = [...new Set(sessoes.map(s => s.alimento))];
  const melhorSessao = sessoes.reduce((a, b) =>
    b.etapasConcluidas.length > a.etapasConcluidas.length ? b : a
  );
  const padroes = detectarPadroes(sessoes);

  const gerarPDF = async () => {
    setGerandoPDF(true);
    try {
      const html = gerarHTML(
        nomeFilho, nomeUsuario, sexoFilho, idade,
        alergias, neuro, sessoes, padroes,
        mediaProgresso, alimentosUnicos,
      );
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Relatório ${artigo} ${nomeFilho}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setGerandoPDF(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSuper}>RELATÓRIO MENSAL</Text>
            <Text style={styles.headerTitulo}>
              Jornada {artigo} {nomeFilho || 'seu pequeno'}
            </Text>
            {idade ? <Text style={styles.headerIdade}>{idade}</Text> : null}
          </View>
          <View style={styles.headerIcone}>
            <MaterialCommunityIcons name="file-chart-outline" size={28} color="#904c1f" />
          </View>
        </View>

        <Text style={styles.headerSub}>
          Compartilhe com o terapeuta para acompanhamento do desenvolvimento alimentar.
        </Text>

        {/* ── Dados da criança ── */}
        {(alergias || neuro) && (
          <View style={styles.dadosCard}>
            <Text style={styles.secaoTitulo}>DADOS DA CRIANÇA</Text>
            {alergias ? (
              <View style={styles.dadosItem}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#b22300" />
                <View style={styles.dadosTexto}>
                  <Text style={styles.dadosLabel}>Alergias / Restrições</Text>
                  <Text style={styles.dadosValor}>{alergias}</Text>
                </View>
              </View>
            ) : null}
            {neuro ? (
              <View style={styles.dadosItem}>
                <MaterialCommunityIcons name="brain" size={16} color="#904c1f" />
                <View style={styles.dadosTexto}>
                  <Text style={styles.dadosLabel}>Neurodivergência</Text>
                  <Text style={styles.dadosValor}>{neuro}</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* ── Estatísticas ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumero}>{totalSessoes}</Text>
            <Text style={styles.statLabel}>SESSÕES</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumero}>{mediaProgresso}%</Text>
            <Text style={styles.statLabel}>PROGRESSO MÉDIO</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumero}>{alimentosUnicos.length}</Text>
            <Text style={styles.statLabel}>ALIMENTOS</Text>
          </View>
        </View>

        {/* ── Padrões detectados ── */}
        {padroes.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>PADRÕES DETECTADOS</Text>
            {padroes.map((p, i) => (
              <View
                key={i}
                style={[
                  styles.padraoCard,
                  p.nivel === 'atencao' && styles.padraoCardAtencao,
                ]}
              >
                <View style={[
                  styles.padraoIconeWrap,
                  p.nivel === 'atencao' && styles.padraoIconeWrapAtencao,
                ]}>
                  <MaterialCommunityIcons
                    name={p.icone as any}
                    size={18}
                    color={p.nivel === 'atencao' ? '#904c1f' : '#b22300'}
                  />
                </View>
                <View style={styles.padraoTexto}>
                  <Text style={styles.padraoTitulo}>{p.titulo}</Text>
                  <Text style={styles.padraoDesc}>{p.descricao}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Melhor sessão ── */}
        <View style={styles.destaqueCard}>
          <View style={styles.destaqueHeader}>
            <MaterialCommunityIcons name="star-circle-outline" size={18} color="#b22300" />
            <Text style={styles.destaqueSuper}>MELHOR SESSÃO</Text>
          </View>
          <Text style={styles.destaqueTitulo}>{melhorSessao.alimento}</Text>
          <Text style={styles.destaqueData}>{formatarData(melhorSessao.data)}</Text>
          <View style={styles.etapasRow}>
            {melhorSessao.etapasConcluidas.map(e => (
              <View key={e} style={styles.etapaBadge}>
                <Text style={styles.etapaBadgeText}>{ETAPAS_LABELS[e]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Histórico ── */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>HISTÓRICO DE SESSÕES</Text>
          {sessoes.map(sessao => {
            const pct = progresso(sessao.etapasConcluidas, sessao.totalEtapas);
            return (
              <View key={sessao.id} style={styles.sessaoCard}>
                <View style={styles.sessaoHeader}>
                  <View style={styles.sessaoIconeWrap}>
                    <MaterialCommunityIcons name="food-apple" size={18} color="#904c1f" />
                  </View>
                  <View style={styles.sessaoInfo}>
                    <Text style={styles.sessaoAlimento}>{sessao.alimento}</Text>
                    <Text style={styles.sessaoData}>{formatarData(sessao.data)}</Text>
                  </View>
                  <View style={[
                    styles.sessaoPctBadge,
                    pct >= 80 && styles.sessaoPctAlto,
                    pct >= 50 && pct < 80 && styles.sessaoPctMedio,
                  ]}>
                    <Text style={[styles.sessaoPctText, pct >= 50 && styles.sessaoPctClaro]}>
                      {pct}%
                    </Text>
                  </View>
                </View>
                <View style={styles.etapasWrap}>
                  {Object.keys(ETAPAS_LABELS).map(id => {
                    const feita = sessao.etapasConcluidas.includes(id);
                    return (
                      <View key={id} style={[styles.etapaChip, feita && styles.etapaChipFeita]}>
                        <MaterialCommunityIcons
                          name={feita ? 'check' : 'minus'}
                          size={9}
                          color={feita ? '#fff' : '#c4c2b8'}
                        />
                        <Text style={[styles.etapaChipText, feita && styles.etapaChipTextFeita]}>
                          {ETAPAS_LABELS[id]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Botão PDF ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.pdfBtn, gerandoPDF && styles.btnOff]}
          onPress={gerarPDF}
          disabled={gerandoPDF}
        >
          <MaterialCommunityIcons
            name={gerandoPDF ? 'loading' : 'file-pdf-box'}
            size={22}
            color="#fff"
          />
          <Text style={styles.pdfBtnText}>
            {gerandoPDF ? 'Gerando PDF...' : 'Exportar PDF para Terapeuta'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.footerNota}>
          Compartilha por WhatsApp, e-mail ou salva no celular
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf9ef' },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  headerSuper: { fontSize: 11, fontWeight: '700', color: '#904c1f', letterSpacing: 1.5, marginBottom: 4 },
  headerTitulo: { fontSize: 28, fontWeight: '800', color: '#1b1c16', letterSpacing: -0.5 },
  headerIdade: { fontSize: 13, color: '#904c1f', fontWeight: '600', marginTop: 4 },
  headerIcone: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ffdbc9', justifyContent: 'center', alignItems: 'center' },
  headerSub: { fontSize: 14, color: '#5e5c54', lineHeight: 22, marginBottom: 24 },

  dadosCard: { backgroundColor: '#fff5f3', borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1.5, borderColor: 'rgba(178,35,0,0.1)' },
  dadosItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  dadosTexto: { flex: 1 },
  dadosLabel: { fontSize: 11, color: '#5e5c54', fontWeight: '600', marginBottom: 2 },
  dadosValor: { fontSize: 14, fontWeight: '700', color: '#1b1c16' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#f6f4ea', borderRadius: 20, padding: 16, alignItems: 'center' },
  statNumero: { fontSize: 26, fontWeight: '800', color: '#b22300', marginBottom: 4 },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#5e5c54', letterSpacing: 1, textAlign: 'center' },

  secao: { marginBottom: 28 },
  secaoTitulo: { fontSize: 11, fontWeight: '700', color: '#904c1f', letterSpacing: 1.5, marginBottom: 14 },

  padraoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f6f4ea', borderRadius: 18, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#b22300' },
  padraoCardAtencao: { backgroundColor: '#fff5f3', borderLeftColor: '#904c1f' },
  padraoIconeWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffdbc9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  padraoIconeWrapAtencao: { backgroundColor: '#ffe4d6' },
  padraoTexto: { flex: 1 },
  padraoTitulo: { fontSize: 14, fontWeight: '700', color: '#1b1c16', marginBottom: 4 },
  padraoDesc: { fontSize: 12, color: '#5e5c54', lineHeight: 18 },

  destaqueCard: { backgroundColor: '#fff5f3', borderRadius: 24, padding: 20, marginBottom: 28, borderWidth: 1.5, borderColor: 'rgba(178,35,0,0.12)' },
  destaqueHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  destaqueSuper: { fontSize: 10, fontWeight: '700', color: '#b22300', letterSpacing: 1.2 },
  destaqueTitulo: { fontSize: 20, fontWeight: '800', color: '#1b1c16', marginBottom: 4 },
  destaqueData: { fontSize: 12, color: '#5e5c54', marginBottom: 14 },
  etapasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  etapaBadge: { backgroundColor: '#b22300', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  etapaBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  sessaoCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 10, shadowColor: '#4b4944', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 1 },
  sessaoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sessaoIconeWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffdbc9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sessaoInfo: { flex: 1 },
  sessaoAlimento: { fontSize: 14, fontWeight: '700', color: '#1b1c16' },
  sessaoData: { fontSize: 12, color: '#5e5c54', marginTop: 2 },
  sessaoPctBadge: { backgroundColor: '#f6f4ea', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  sessaoPctMedio: { backgroundColor: '#ffdbc9' },
  sessaoPctAlto: { backgroundColor: '#b22300' },
  sessaoPctText: { fontSize: 12, fontWeight: '800', color: '#5e5c54' },
  sessaoPctClaro: { color: '#fff' },
  etapasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  etapaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f0eee4', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 100 },
  etapaChipFeita: { backgroundColor: '#b22300' },
  etapaChipText: { fontSize: 10, color: '#5e5c54', fontWeight: '600' },
  etapaChipTextFeita: { color: '#fff' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 20, backgroundColor: '#fcf9ef' },
  pdfBtn: { backgroundColor: '#b22300', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20, borderRadius: 100, shadowColor: '#b22300', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 5 },
  btnOff: { opacity: 0.5 },
  pdfBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  footerNota: { textAlign: 'center', fontSize: 12, color: '#5e5c54', marginTop: 10 },
});