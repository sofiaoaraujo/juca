import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFilhos } from '../../context/FilhosContext';
import { gerarAnaliseRelatorio, type AnaliseRelatorio } from '../../services/gemini';
import api from '../../services/api';

// TODO: login
const DEV_CUIDADOR_ID = '94d656c5-513f-49bd-bb8b-e005f33c9b29';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Sessao = {
  id: string;
  alimento: string;
  categoria: string;
  textura: string;
  cor: string;
  data: string;
  etapasConcluidas: string[];
  totalEtapas: number;
  fotos?: string[];
};

// ─── Mock ─────────────────────────────────────────────────────────────────────
const SESSOES_MOCK: Sessao[] = [
  { id: '1', alimento: 'Banana Amassada', categoria: 'Fruta', textura: 'macio', cor: 'amarelo', data: '2026-04-18T10:00:00', etapasConcluidas: ['tolerar', 'interagir', 'cheirar', 'beijar', 'morder', 'comer'], totalEtapas: 6, fotos: [] },
  { id: '2', alimento: 'Cenoura Cozida', categoria: 'Legume', textura: 'macio', cor: 'laranja', data: '2026-04-17T09:30:00', etapasConcluidas: ['tolerar', 'interagir'], totalEtapas: 6, fotos: [] },
  { id: '3', alimento: 'Banana Amassada', categoria: 'Fruta', textura: 'macio', cor: 'amarelo', data: '2026-04-16T11:00:00', etapasConcluidas: ['tolerar', 'interagir', 'cheirar', 'beijar'], totalEtapas: 6, fotos: [] },
  { id: '4', alimento: 'Arroz', categoria: 'Carboidrato', textura: 'macio', cor: 'branco', data: '2026-04-15T10:30:00', etapasConcluidas: ['tolerar'], totalEtapas: 6, fotos: [] },
];

const ETAPAS_LABELS: Record<string, string> = {
  tolerar: 'Tolerar', interagir: 'Interagir', cheirar: 'Cheirar',
  beijar: 'Beijar/Lamber', morder: 'Morder', comer: 'Comer',
};

const formatarData = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

const calcularIdade = (dataNasc: string): string => {
  if (!dataNasc || dataNasc.length < 10) return '';
  const [dia, mes, ano] = dataNasc.split('/');
  const nasc = new Date(`${ano}-${mes}-${dia}`);
  const meses = (new Date().getFullYear() - nasc.getFullYear()) * 12 + (new Date().getMonth() - nasc.getMonth());
  if (meses < 24) return `${meses} meses`;
  const anos = Math.floor(meses / 12);
  const m = meses % 12;
  return m > 0 ? `${anos} anos e ${m} meses` : `${anos} anos`;
};

const progresso = (etapas: string[], total: number) => Math.round((etapas.length / total) * 100);

// ─── Detecção de padrões humanizada ──────────────────────────────────────────
type Padrao = {
  texto: string;
  nivel: 'positivo' | 'atencao';
  icone: string;
};

const detectarPadroes = (sessoes: Sessao[], nomeFilho: string): Padrao[] => {
  const padroes: Padrao[] = [];
  const nome = nomeFilho || 'A criança';
  if (sessoes.length === 0) return padroes;

  // Padrão de textura
  const mediasPorTextura: Record<string, number[]> = {};
  sessoes.forEach(s => {
    if (!mediasPorTextura[s.textura]) mediasPorTextura[s.textura] = [];
    mediasPorTextura[s.textura].push(s.etapasConcluidas.length);
  });
  const texturas = Object.entries(mediasPorTextura)
    .map(([t, v]) => ({ textura: t, media: v.reduce((a, b) => a + b, 0) / v.length }))
    .sort((a, b) => b.media - a.media);
  if (texturas.length > 0) {
    padroes.push({
      icone: 'hand-wave-outline',
      texto: `${nome} prefere alimentos ${texturas[0].textura}s — as sessões com essa textura têm maior progressão nas etapas SOS.`,
      nivel: 'positivo',
    });
  }

  // Padrão de cor
  const mediasPorCor: Record<string, number[]> = {};
  sessoes.forEach(s => {
    if (!mediasPorCor[s.cor]) mediasPorCor[s.cor] = [];
    mediasPorCor[s.cor].push(s.etapasConcluidas.length);
  });
  const cores = Object.entries(mediasPorCor)
    .map(([c, v]) => ({ cor: c, media: v.reduce((a, b) => a + b, 0) / v.length }))
    .sort((a, b) => b.media - a.media);
  if (cores.length > 1) {
    padroes.push({
      icone: 'palette-outline',
      texto: `${nome} demonstra maior aceitação com alimentos de cor ${cores[0].cor}. Pode ser um ponto de entrada para novos alimentos similares.`,
      nivel: 'positivo',
    });
  }

  // Padrão de categoria
  const mediasPorCategoria: Record<string, number[]> = {};
  sessoes.forEach(s => {
    if (!mediasPorCategoria[s.categoria]) mediasPorCategoria[s.categoria] = [];
    mediasPorCategoria[s.categoria].push(s.etapasConcluidas.length);
  });
  const categorias = Object.entries(mediasPorCategoria)
    .map(([c, v]) => ({ categoria: c, media: v.reduce((a, b) => a + b, 0) / v.length }))
    .sort((a, b) => b.media - a.media);
  if (categorias.length > 1) {
    padroes.push({
      icone: 'food-apple',
      texto: `${nome} avança mais com ${categorias[0].categoria}s. A categoria ${categorias[categorias.length - 1].categoria} ainda requer atenção — sugerimos introdução gradual após consolidar os avanços atuais.`,
      nivel: categorias[categorias.length - 1].media < 2 ? 'atencao' : 'positivo',
    });
  }

  // Evolução ao longo do tempo
  if (sessoes.length >= 3) {
    const ordenadas = [...sessoes].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    const primeiras = ordenadas.slice(0, 2).map(s => s.etapasConcluidas.length);
    const ultimas = ordenadas.slice(-2).map(s => s.etapasConcluidas.length);
    const mediaInicio = primeiras.reduce((a, b) => a + b, 0) / primeiras.length;
    const mediaFim = ultimas.reduce((a, b) => a + b, 0) / ultimas.length;
    if (mediaFim > mediaInicio) {
      padroes.push({
        icone: 'trending-up',
        texto: `${nome} demonstra evolução consistente ao longo das sessões — o progresso médio aumentou de ${Math.round(mediaInicio)}/6 para ${Math.round(mediaFim)}/6 etapas, indicando boa adesão ao método SOS.`,
        nivel: 'positivo',
      });
    }
  }

  return padroes;
};

// ─── Seção colapsável ─────────────────────────────────────────────────────────
function Secao({ titulo, icone, children, iniciarAberta = false }: {
  titulo: string; icone: string; children: React.ReactNode; iniciarAberta?: boolean;
}) {
  const [aberta, setAberta] = useState(iniciarAberta);
  return (
    <View style={secaoStyles.container}>
      <TouchableOpacity activeOpacity={0.75} style={secaoStyles.header} onPress={() => setAberta(!aberta)}>
        <View style={secaoStyles.headerLeft}>
          <MaterialCommunityIcons name={icone as any} size={18} color="#904c1f" />
          <Text style={secaoStyles.titulo}>{titulo}</Text>
        </View>
        <MaterialCommunityIcons name={aberta ? 'chevron-up' : 'chevron-down'} size={20} color="#5e5c54" />
      </TouchableOpacity>
      {aberta && <View style={secaoStyles.conteudo}>{children}</View>}
    </View>
  );
}

const secaoStyles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 12, overflow: 'hidden', shadowColor: '#4b4944', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titulo: { fontSize: 15, fontWeight: '700', color: '#1b1c16' },
  conteudo: { paddingHorizontal: 18, paddingBottom: 18 },
});

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Relatorio() {
  const { filhoAtivo } = useFilhos();
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [sessoes] = useState<Sessao[]>(SESSOES_MOCK);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [analise, setAnalise] = useState<AnaliseRelatorio | null>(null);
  const [carregandoAnalise, setCarregandoAnalise] = useState(false);

  const carregarAnalise = async () => {
    // ✅ Verificação alterada para ID
    if (!filhoAtivo?.id || sessoes.length === 0) return;
    setCarregandoAnalise(true);
    try {
      // ✅ Chamada simplificada enviando apenas o ID para o Back-end!
      const resultado = await gerarAnaliseRelatorio(filhoAtivo.id);
      setAnalise(resultado);
    } catch (error) {
      console.error('Erro ao gerar análise:', error);
    } finally {
      setCarregandoAnalise(false);
    }
  };

  useEffect(() => {
      api.get(`/usuarios/${DEV_CUIDADOR_ID}`)
      .then(r => setNomeUsuario(r.data.nome))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // ✅ Dependency alterada para ID
    if (filhoAtivo?.id) carregarAnalise();
  }, [filhoAtivo?.id]);

  const nomeFilho = filhoAtivo?.nome ?? '';
  const sexoFilho = filhoAtivo?.sexo ?? '';
  const dataNasc = filhoAtivo?.dataNasc ?? '';
  const alergias = filhoAtivo?.alergias ?? '';
  const neuro = filhoAtivo?.neuro ?? '';
  const artigo = sexoFilho === 'Feminino' ? 'da' : 'do';
  const idade = calcularIdade(dataNasc);

  const totalSessoes = sessoes.length;
  const mediaProgresso = Math.round(sessoes.reduce((acc, s) => acc + progresso(s.etapasConcluidas, s.totalEtapas), 0) / totalSessoes);
  const melhorSessao = sessoes.reduce((a, b) => b.etapasConcluidas.length > a.etapasConcluidas.length ? b : a);
  const conquistasComFoto = sessoes.filter(s => s.fotos && s.fotos.length > 0 && s.etapasConcluidas.includes('comer'));
  const alimentosUnicos = [...new Set(sessoes.map(s => s.alimento))];

  const gerarPDF = async () => {
    setGerandoPDF(true);
    try {
      const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      const analiseHTML = analise ? `
        <div class="label">ANÁLISE CLÍNICA</div>
        <div style="background:#f6f4ea;border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #b22300;">
          <p style="margin:0;font-size:13px;color:#1b1c16;line-height:1.6;">${analise.resumo_clinico}</p>
        </div>
        ${analise.padroes_aceitacao.length > 0 ? `
          <div class="label">PADRÕES IDENTIFICADOS</div>
          ${analise.padroes_aceitacao.map(p => `
            <div style="background:#f6f4ea;border-radius:10px;padding:12px;margin-bottom:8px;border-left:4px solid #b22300;">
              <p style="margin:0;font-size:13px;color:#1b1c16;line-height:1.6;">${p}</p>
            </div>`).join('')}
        ` : ''}
        ${analise.recomendacao ? `
          <div class="label">RECOMENDAÇÃO</div>
          <div style="background:#ffdbc9;border-radius:10px;padding:12px;margin-bottom:12px;">
            <p style="margin:0;font-size:13px;color:#904c1f;line-height:1.6;">${analise.recomendacao}</p>
          </div>
        ` : ''}
      ` : '';

      const fotosHTML = conquistasComFoto.length > 0
        ? `<div class="label">REGISTRO FOTOGRÁFICO DAS CONQUISTAS</div>
           <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
             ${conquistasComFoto.map(s => `
               <div style="border-radius:12px;overflow:hidden;background:#f6f4ea;">
                 ${s.fotos && s.fotos[0] ? `<img src="${s.fotos[0]}" style="width:100%;height:140px;object-fit:cover;"/>` : '<div style="width:100%;height:140px;background:#e4e3d9;display:flex;align-items:center;justify-content:center;"><span style="color:#c4c2b8;">Sem foto</span></div>'}
                 <div style="padding:8px;">
                   <strong style="font-size:13px;">${s.alimento}</strong><br/>
                   <span style="font-size:11px;color:#5e5c54;">${formatarData(s.data)}</span>
                 </div>
               </div>`).join('')}
           </div>` : '';

      const sessoesHTML = sessoes.map(s => {
        const pct = progresso(s.etapasConcluidas, s.totalEtapas);
        const etapasHTML = Object.keys(ETAPAS_LABELS).map(id => {
          const feita = s.etapasConcluidas.includes(id);
          return `<span style="display:inline-block;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;margin:2px;background:${feita ? '#b22300' : '#f0eee4'};color:${feita ? '#fff' : '#5e5c54'};">${ETAPAS_LABELS[id]}</span>`;
        }).join('');
        return `<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:8px;border:1px solid #f0eee4;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <div><strong>${s.alimento}</strong><br/><span style="font-size:12px;color:#5e5c54;">${formatarData(s.data)}</span></div>
            <span style="background:${pct >= 80 ? '#b22300' : '#f6f4ea'};color:${pct >= 80 ? '#fff' : '#5e5c54'};padding:4px 10px;border-radius:100px;font-weight:700;">${pct}%</span>
          </div>
          <div>${etapasHTML}</div>
        </div>`;
      }).join('');

      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
        <style>body{font-family:-apple-system,sans-serif;background:#fcf9ef;color:#1b1c16;padding:32px;}
        h1{font-size:26px;font-weight:800;margin-bottom:4px;}
        .badge{display:inline-block;background:#ffdbc9;color:#904c1f;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:700;margin-bottom:20px;}
        .card{background:#fff;border-radius:14px;padding:18px;margin-bottom:14px;}
        .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;}
        .stat{background:#f6f4ea;border-radius:12px;padding:14px;text-align:center;}
        .stat-n{font-size:26px;font-weight:800;color:#b22300;}
        .stat-l{font-size:10px;font-weight:700;color:#5e5c54;letter-spacing:1px;}
        .label{font-size:11px;font-weight:700;color:#904c1f;letter-spacing:1.5px;margin-bottom:10px;margin-top:16px;}
        </style></head><body>
        <p style="font-size:11px;color:#904c1f;font-weight:700;letter-spacing:1.5px;">RELATÓRIO DE INTRODUÇÃO ALIMENTAR</p>
        <h1>Jornada ${artigo} ${nomeFilho}</h1>
        <span class="badge">Gerado em ${hoje} · App Juca</span>
        <div class="card">
          <div class="label">DADOS DA CRIANÇA</div>
          <p><strong>Nome:</strong> ${nomeFilho} &nbsp; <strong>Idade:</strong> ${idade || '—'} &nbsp; <strong>Sexo:</strong> ${sexoFilho || '—'}</p>
          <p><strong>Responsável:</strong> ${nomeUsuario}</p>
          ${alergias ? `<p style="color:#b22300;"><strong>Alergias:</strong> ${alergias}</p>` : ''}
          ${neuro ? `<p><strong>Neurodivergência:</strong> ${neuro}</p>` : ''}
        </div>
        <div class="grid">
          <div class="stat"><div class="stat-n">${totalSessoes}</div><div class="stat-l">SESSÕES</div></div>
          <div class="stat"><div class="stat-n">${mediaProgresso}%</div><div class="stat-l">PROGRESSO MÉDIO</div></div>
          <div class="stat"><div class="stat-n">${alimentosUnicos.length}</div><div class="stat-l">ALIMENTOS</div></div>
        </div>
        ${analiseHTML}
        ${fotosHTML}
        <div class="label">HISTÓRICO DE SESSÕES</div>
        ${sessoesHTML}
        <div style="border-top:1px solid #e4e3d9;padding-top:14px;margin-top:8px;font-size:12px;color:#5e5c54;">
          <strong>Método:</strong> Food Chaining + SOS Feeding<br/>
          <strong>Observação:</strong> Este relatório é complementar ao acompanhamento terapêutico profissional.
        </div>
        </body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Relatório ${artigo} ${nomeFilho}`, UTI: 'com.adobe.pdf' });
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    } finally {
      setGerandoPDF(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header simples */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSuper}>RELATÓRIO MENSAL</Text>
            <Text style={styles.headerTitulo}>
              Jornada {artigo} {nomeFilho || 'seu pequeno'}
            </Text>
            {idade ? <Text style={styles.headerIdade}>{idade}</Text> : null}
          </View>
          <View style={styles.headerIcone}>
            <MaterialCommunityIcons name="file-chart-outline" size={26} color="#904c1f" />
          </View>
        </View>

        {/* Resumo — sempre visível */}
        <View style={styles.resumoCard}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{totalSessoes}</Text>
              <Text style={styles.statLabel}>SESSÕES</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{mediaProgresso}%</Text>
              <Text style={styles.statLabel}>PROGRESSO</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{alimentosUnicos.length}</Text>
              <Text style={styles.statLabel}>ALIMENTOS</Text>
            </View>
          </View>
          <View style={styles.melhorBox}>
            <MaterialCommunityIcons name="star-circle-outline" size={16} color="#b22300" />
            <Text style={styles.melhorTexto}>
              Melhor sessão: <Text style={{ fontWeight: '800', color: '#1b1c16' }}>{melhorSessao.alimento}</Text> — {melhorSessao.etapasConcluidas.length}/{melhorSessao.totalEtapas} etapas
            </Text>
          </View>
        </View>

        {/* Conquistas com foto */}
        <Secao titulo="Conquistas" icone="image-multiple-outline" iniciarAberta>
          {conquistasComFoto.length > 0 ? (
            <View style={styles.fotosGrid}>
              {conquistasComFoto.map(s => (
                <View key={s.id} style={styles.fotoCard}>
                  {s.fotos && s.fotos[0] ? (
                    <Image source={{ uri: s.fotos[0] }} style={styles.fotoImg} />
                  ) : (
                    <View style={styles.fotoPlaceholder}>
                      <MaterialCommunityIcons name="image-outline" size={32} color="#c4c2b8" />
                    </View>
                  )}
                  <Text style={styles.fotoAlimento}>{s.alimento}</Text>
                  <Text style={styles.fotoData}>{formatarData(s.data)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.semFotoBox}>
              <MaterialCommunityIcons name="camera-outline" size={32} color="#c4c2b8" />
              <Text style={styles.semFotoTexto}>
                As fotos aparecerão aqui quando a criança completar a etapa "Comer" com registro fotográfico.
              </Text>
            </View>
          )}
        </Secao>

        {/* Detalhes para terapeuta — colapsado */}
        <Secao titulo="Detalhes para o Terapeuta" icone="stethoscope">
          {/* Análise clínica do Gemini */}
          {carregandoAnalise ? (
            <View style={styles.analiseLoadingBox}>
              <MaterialCommunityIcons name="loading" size={20} color="#904c1f" />
              <Text style={styles.analiseLoadingText}>Gerando análise clínica...</Text>
            </View>
          ) : analise ? (
            <>
              <Text style={styles.detalheLabel}>ANÁLISE CLÍNICA</Text>
              <View style={styles.analiseBox}>
                <Text style={styles.analiseResumo}>{analise.resumo_clinico}</Text>
              </View>

              {analise.padroes_aceitacao.length > 0 && (
                <>
                  <Text style={styles.detalheLabel}>PADRÕES IDENTIFICADOS</Text>
                  {analise.padroes_aceitacao.map((p, i) => (
                    <View key={i} style={styles.padraoCard}>
                      <MaterialCommunityIcons name="trending-up" size={16} color="#b22300" />
                      <Text style={styles.padraoTexto}>{p}</Text>
                    </View>
                  ))}
                </>
              )}

              {analise.recomendacao ? (
                <>
                  <Text style={styles.detalheLabel}>RECOMENDAÇÃO</Text>
                  <View style={styles.recomendacaoBox}>
                    <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#904c1f" />
                    <Text style={styles.recomendacaoTexto}>{analise.recomendacao}</Text>
                  </View>
                </>
              ) : null}
            </>
          ) : (
            <TouchableOpacity activeOpacity={0.8} style={styles.analiseRecarregarBox} onPress={carregarAnalise}>
              <MaterialCommunityIcons name="refresh" size={18} color="#b22300" />
              <Text style={styles.analiseRecarregarText}>Gerar análise clínica</Text>
            </TouchableOpacity>
          )}

          {/* Dados da criança */}
          {(alergias || neuro) && (
            <View style={styles.dadosBox}>
              {alergias ? (
                <View style={styles.dadosItem}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#b22300" />
                  <Text style={styles.dadosTexto}><Text style={{ fontWeight: '700' }}>Alergias:</Text> {alergias}</Text>
                </View>
              ) : null}
              {neuro ? (
                <View style={styles.dadosItem}>
                  <MaterialCommunityIcons name="brain" size={15} color="#904c1f" />
                  <Text style={styles.dadosTexto}><Text style={{ fontWeight: '700' }}>Neurodivergência:</Text> {neuro}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Histórico */}
          <Text style={styles.detalheLabel}>HISTÓRICO DE SESSÕES</Text>
          {sessoes.map(s => {
            const pct = progresso(s.etapasConcluidas, s.totalEtapas);
            return (
              <View key={s.id} style={styles.sessaoCard}>
                <View style={styles.sessaoHeader}>
                  <View style={styles.sessaoInfo}>
                    <Text style={styles.sessaoAlimento}>{s.alimento}</Text>
                    <Text style={styles.sessaoData}>{formatarData(s.data)}</Text>
                  </View>
                  <View style={[styles.pctBadge, pct >= 80 && styles.pctBadgeAlto]}>
                    <Text style={[styles.pctText, pct >= 80 && styles.pctTextClaro]}>{pct}%</Text>
                  </View>
                </View>
                <View style={styles.etapasWrap}>
                  {Object.keys(ETAPAS_LABELS).map(id => {
                    const feita = s.etapasConcluidas.includes(id);
                    return (
                      <View key={id} style={[styles.etapaChip, feita && styles.etapaChipFeita]}>
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

          <Text style={styles.detalheLabel}>MÉTODO</Text>
          <View style={styles.metodoBox}>
            <View style={styles.metodoItem}>
              <MaterialCommunityIcons name="link-variant" size={15} color="#904c1f" />
              <Text style={styles.metodoTexto}>Food Chaining — sugestão baseada em preferências existentes</Text>
            </View>
            <View style={styles.metodoItem}>
              <MaterialCommunityIcons name="hand-wave-outline" size={15} color="#904c1f" />
              <Text style={styles.metodoTexto}>SOS Feeding — 6 etapas sensoriais progressivas</Text>
            </View>
          </View>
        </Secao>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botão PDF fixo */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.pdfBtn, gerandoPDF && { opacity: 0.5 }]}
          onPress={gerarPDF}
          disabled={gerandoPDF}
        >
          <MaterialCommunityIcons name={gerandoPDF ? 'loading' : 'file-pdf-box'} size={22} color="#fff" />
          <Text style={styles.pdfBtnText}>
            {gerandoPDF ? 'Gerando PDF...' : 'Exportar PDF para Terapeuta'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.footerNota}>Compartilha por WhatsApp, e-mail ou salva no celular</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf9ef' },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerSuper: { fontSize: 11, fontWeight: '700', color: '#904c1f', letterSpacing: 1.5, marginBottom: 4 },
  headerTitulo: { fontSize: 26, fontWeight: '800', color: '#1b1c16', letterSpacing: -0.5 },
  headerIdade: { fontSize: 13, color: '#904c1f', fontWeight: '600', marginTop: 4 },
  headerIcone: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#ffdbc9', justifyContent: 'center', alignItems: 'center' },

  resumoCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 14, shadowColor: '#4b4944', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#f6f4ea', borderRadius: 16, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#b22300', marginBottom: 2 },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#5e5c54', letterSpacing: 1, textAlign: 'center' },
  melhorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff5f3', borderRadius: 12, padding: 12 },
  melhorTexto: { flex: 1, fontSize: 13, color: '#5e5c54', lineHeight: 18 },

  fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fotoCard: { width: '47%', borderRadius: 14, overflow: 'hidden', backgroundColor: '#f6f4ea' },
  fotoImg: { width: '100%', height: 110 },
  fotoPlaceholder: { width: '100%', height: 110, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0eee4' },
  fotoAlimento: { fontSize: 12, fontWeight: '700', color: '#1b1c16', padding: 8, paddingBottom: 2 },
  fotoData: { fontSize: 11, color: '#5e5c54', paddingHorizontal: 8, paddingBottom: 8 },
  semFotoBox: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  semFotoTexto: { fontSize: 13, color: '#5e5c54', textAlign: 'center', lineHeight: 20 },

  padraoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#f6f4ea', borderRadius: 14, padding: 14, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#b22300' },
  padraoTexto: { flex: 1, fontSize: 13, color: '#1b1c16', lineHeight: 20 },
  analiseLoadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, justifyContent: 'center' },
  analiseLoadingText: { fontSize: 13, color: '#904c1f' },
  analiseBox: { backgroundColor: '#f6f4ea', borderRadius: 14, padding: 14, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#b22300' },
  analiseResumo: { fontSize: 13, color: '#1b1c16', lineHeight: 22 },
  recomendacaoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#ffdbc9', borderRadius: 14, padding: 14, marginBottom: 8 },
  recomendacaoTexto: { flex: 1, fontSize: 13, color: '#904c1f', lineHeight: 20 },
  analiseRecarregarBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: '#fff5f3', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(178,35,0,0.15)', marginBottom: 16 },
  analiseRecarregarText: { fontSize: 14, fontWeight: '700', color: '#b22300' },
  dadosBox: { backgroundColor: '#fff5f3', borderRadius: 14, padding: 14, marginBottom: 16, gap: 8 },
  dadosItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dadosTexto: { flex: 1, fontSize: 13, color: '#1b1c16', lineHeight: 20 },

  detalheLabel: { fontSize: 10, fontWeight: '700', color: '#904c1f', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },
  sessaoCard: { backgroundColor: '#f6f4ea', borderRadius: 14, padding: 14, marginBottom: 8 },
  sessaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sessaoInfo: { flex: 1 },
  sessaoAlimento: { fontSize: 14, fontWeight: '700', color: '#1b1c16' },
  sessaoData: { fontSize: 11, color: '#5e5c54', marginTop: 2 },
  pctBadge: { backgroundColor: '#e4e3d9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  pctBadgeAlto: { backgroundColor: '#b22300' },
  pctText: { fontSize: 12, fontWeight: '800', color: '#5e5c54' },
  pctTextClaro: { color: '#fff' },
  etapasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  etapaChip: { backgroundColor: '#e4e3d9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  etapaChipFeita: { backgroundColor: '#b22300' },
  etapaChipText: { fontSize: 10, color: '#5e5c54', fontWeight: '600' },
  etapaChipTextFeita: { color: '#fff' },
  metodoBox: { backgroundColor: '#f6f4ea', borderRadius: 14, padding: 14, gap: 10 },
  metodoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metodoTexto: { flex: 1, fontSize: 13, color: '#5e5c54', lineHeight: 20 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 32 : 20, backgroundColor: '#fcf9ef' },
  pdfBtn: { backgroundColor: '#b22300', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 100, elevation: 4, shadowColor: '#b22300', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12 },
  pdfBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  footerNota: { textAlign: 'center', fontSize: 12, color: '#5e5c54', marginTop: 10 },
});