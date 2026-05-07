import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { supabase } from '../../services/supabase';
import { buscarHistoricoIA, type HistoricoIAItem } from '../../services/progresso';

// ─── Etapas SOS: status canônicos do backend → rótulos visuais ───────────────
const STATUS_DISPLAY: { key: string; label: string }[] = [
  { key: 'Tolerar',   label: 'Tolerar' },
  { key: 'Interagir', label: 'Interagir' },
  { key: 'Cheirar',   label: 'Cheirar' },
  { key: 'Tocar',     label: 'Beijar / Lamber' },
  { key: 'Saborear',  label: 'Morder' },
  { key: 'Comer',     label: 'Comer' },
];

const formatarData = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

const calcularIdade = (dataNasc: string): string => {
  if (!dataNasc || dataNasc.length < 10) return '';
  const [dia, mes, ano] = dataNasc.split('/');
  const nasc = new Date(`${ano}-${mes}-${dia}`);
  const meses =
    (new Date().getFullYear() - nasc.getFullYear()) * 12 +
    (new Date().getMonth() - nasc.getMonth());
  if (meses < 24) return `${meses} meses`;
  const anos = Math.floor(meses / 12);
  const m = meses % 12;
  return m > 0 ? `${anos} anos e ${m} meses` : `${anos} anos`;
};

const calcProgresso = (etapas: string[]) =>
  Math.round((etapas.filter(e => e !== 'Recusado').length / 6) * 100);

// ─── Seção colapsável ─────────────────────────────────────────────────────────
function Secao({
  titulo,
  icone,
  children,
  iniciarAberta = false,
}: {
  titulo: string;
  icone: string;
  children: React.ReactNode;
  iniciarAberta?: boolean;
}) {
  const [aberta, setAberta] = useState(iniciarAberta);
  return (
    <View style={secaoStyles.container}>
      <TouchableOpacity
        activeOpacity={0.75}
        style={secaoStyles.header}
        onPress={() => setAberta(!aberta)}
      >
        <View style={secaoStyles.headerLeft}>
          <MaterialCommunityIcons name={icone as any} size={18} color="#904c1f" />
          <Text style={secaoStyles.titulo}>{titulo}</Text>
        </View>
        <MaterialCommunityIcons
          name={aberta ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#5e5c54"
        />
      </TouchableOpacity>
      {aberta && <View style={secaoStyles.conteudo}>{children}</View>}
    </View>
  );
}

const secaoStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#4b4944',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titulo: { fontSize: 15, fontWeight: '700', color: '#1b1c16' },
  conteudo: { paddingHorizontal: 18, paddingBottom: 18 },
});

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Relatorio() {
  const { filhoAtivo } = useFilhos();
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [historicoIA, setHistoricoIA] = useState<HistoricoIAItem[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [analise, setAnalise] = useState<AnaliseRelatorio | null>(null);
  const [carregandoAnalise, setCarregandoAnalise] = useState(false);

  const carregarAnalise = async (force = false) => {
    if (!filhoAtivo?.id) return;
    setCarregandoAnalise(true);
    try {
      const resultado = await gerarAnaliseRelatorio(filhoAtivo.id, force);
      setAnalise(resultado);
    } catch (error) {
      console.error('Erro ao gerar análise:', error);
    } finally {
      setCarregandoAnalise(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const nome = user?.user_metadata?.nome ?? '';
      if (nome) setNomeUsuario(nome);
    });
  }, []);

  useEffect(() => {
    if (!filhoAtivo?.id) return;
    carregarAnalise();
  }, [filhoAtivo?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!filhoAtivo?.id) return;
      setCarregandoHistorico(true);
      buscarHistoricoIA(filhoAtivo.id)
        .then(setHistoricoIA)
        .finally(() => setCarregandoHistorico(false));
    }, [filhoAtivo?.id]),
  );

  const nomeFilho  = filhoAtivo?.nome ?? '';
  const sexoFilho  = filhoAtivo?.sexo ?? '';
  const dataNasc   = filhoAtivo?.dataNasc ?? '';
  const alergias   = filhoAtivo?.alergias ?? '';
  const neuro      = filhoAtivo?.neuro ?? '';
  const artigo     = sexoFilho === 'Feminino' ? 'da' : 'do';
  const idade      = calcularIdade(dataNasc);

  // ─── Métricas derivadas do histórico real ──────────────────────────────────
  const totalAlimentos = historicoIA.length;
  const mediaProgresso =
    totalAlimentos > 0
      ? Math.round(
          historicoIA.reduce((acc, s) => acc + calcProgresso(s.etapas_concluidas), 0) /
            totalAlimentos,
        )
      : 0;
  const melhorItem =
    historicoIA.length > 0
      ? historicoIA.reduce((a, b) =>
          b.etapas_concluidas.length > a.etapas_concluidas.length ? b : a,
        )
      : null;
  const conquistasCompletas = historicoIA.filter(s => s.etapa_atual === 'Comer');
  const alimentosRecusados = historicoIA.filter(s => s.etapa_atual === 'Recusado');
  const alimentosUnicos = [...new Set(historicoIA.map(s => s.alimento?.nome ?? ''))];

  // ─── Geração do PDF ────────────────────────────────────────────────────────
  const gerarPDF = async () => {
    setGerandoPDF(true);
    try {
      const hoje = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const analiseHTML = analise
        ? `
        <div class="label">ANÁLISE CLÍNICA</div>
        <div style="background:#f6f4ea;border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #b22300;">
          <p style="margin:0;font-size:13px;color:#1b1c16;line-height:1.6;">${analise.resumo_clinico}</p>
        </div>
        ${
          analise.padroes_aceitacao.length > 0
            ? `<div class="label">PADRÕES IDENTIFICADOS</div>
               ${analise.padroes_aceitacao
                 .map(
                   p => `<div style="background:#f6f4ea;border-radius:10px;padding:12px;margin-bottom:8px;border-left:4px solid #b22300;">
                           <p style="margin:0;font-size:13px;color:#1b1c16;line-height:1.6;">${p}</p>
                         </div>`,
                 )
                 .join('')}`
            : ''
        }
        ${
          analise.recomendacao
            ? `<div class="label">RECOMENDAÇÃO</div>
               <div style="background:#ffdbc9;border-radius:10px;padding:12px;margin-bottom:12px;">
                 <p style="margin:0;font-size:13px;color:#904c1f;line-height:1.6;">${analise.recomendacao}</p>
               </div>`
            : ''
        }`
        : '';

      const conquistasHTML =
        conquistasCompletas.length > 0
          ? `<div class="label">CONQUISTAS — ALIMENTOS ACEITOS</div>
             <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
               ${conquistasCompletas
                 .map(
                   s => `<div style="border-radius:10px;background:#f6f4ea;padding:10px 14px;">
                           <strong style="font-size:13px;">${s.alimento?.nome ?? ''}</strong><br/>
                           <span style="font-size:11px;color:#5e5c54;">${formatarData(s.created_at)}</span>
                         </div>`,
                 )
                 .join('')}
             </div>`
          : '';

      const recusadosHTML =
        alimentosRecusados.length > 0
          ? `<div class="label">ALIMENTOS RECUSADOS</div>
             <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
               ${alimentosRecusados.map(s =>
                 `<div style="border-radius:10px;background-color:#f0eee4;padding:10px 14px;">
                    <strong style="font-size:13px;color:#5e5c54;">${s.alimento?.nome ?? ''}</strong><br/>
                    <span style="font-size:11px;color:#5e5c54;">${formatarData(s.created_at)}</span>
                  </div>`
               ).join('')}
             </div>`
          : '';

      const sessoesHTML = historicoIA
        .map(s => {
          const pct = calcProgresso(s.etapas_concluidas);
          const eRecusado = s.etapa_atual === 'Recusado';
          const etapasHTML = STATUS_DISPLAY.map(({ key, label }) => {
            const feita = s.etapas_concluidas.includes(key);
            return `<span style="display:inline-block;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;margin:2px;background-color:${feita ? '#b22300' : '#f0eee4'};color:${feita ? '#fff' : '#5e5c54'};">${label}</span>`;
          }).join('') + (eRecusado
            ? `<span style="display:inline-block;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;margin:2px;background:#5e5c54;color:#fff;">Recusado</span>`
            : '');
          const badgeHTML = eRecusado
            ? `<span style="background:#5e5c54;color:#fff;padding:4px 10px;border-radius:100px;font-weight:700;font-size:12px;">Recusado</span>`
            : `<span style="background:${pct >= 80 ? '#b22300' : '#f6f4ea'};color:${pct >= 80 ? '#fff' : '#5e5c54'};padding:4px 10px;border-radius:100px;font-weight:700;">${pct}%</span>`;
          return `<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:8px;border:1px solid #f0eee4;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <div>
                <strong>${s.alimento?.nome ?? ''}</strong><br/>
                <span style="font-size:12px;color:#5e5c54;">${formatarData(s.created_at)}</span>
              </div>
              ${badgeHTML}
            </div>
            ${s.justificativa_ia ? `<p style="font-size:11px;color:#904c1f;margin:0 0 8px;font-style:italic;">${s.justificativa_ia}</p>` : ''}
            <div>${etapasHTML}</div>
          </div>`;
        })
        .join('');

      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
        <style>
          *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
          body{font-family:-apple-system,sans-serif;background:#fcf9ef;color:#1b1c16;padding:32px;}
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
          <div class="stat"><div class="stat-n">${totalAlimentos}</div><div class="stat-l">EM TESTE</div></div>
          <div class="stat"><div class="stat-n">${mediaProgresso}%</div><div class="stat-l">PROGRESSO MÉDIO</div></div>
          <div class="stat"><div class="stat-n">${alimentosUnicos.length}</div><div class="stat-l">ALIMENTOS</div></div>
        </div>
        ${analiseHTML}
        ${conquistasHTML}
        ${recusadosHTML}
        <div class="label">HISTÓRICO DE SESSÃO</div>
        ${sessoesHTML || '<p style="color:#5e5c54;font-size:13px;">Nenhuma sessão registrada ainda.</p>'}
        <div style="border-top:1px solid #e4e3d9;padding-top:14px;margin-top:8px;font-size:12px;color:#5e5c54;">
          <strong>Método:</strong> Food Chaining + SOS Feeding<br/>
          <strong>Observação:</strong> Este relatório é complementar ao acompanhamento terapêutico profissional.
        </div>
        </body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Relatório ${artigo} ${nomeFilho}`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    } finally {
      setGerandoPDF(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
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

        {/* Resumo */}
        <View style={styles.resumoCard}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{totalAlimentos}</Text>
              <Text style={styles.statLabel}>EM TESTE</Text>
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
          {melhorItem && (
            <View style={styles.melhorBox}>
              <MaterialCommunityIcons name="star-circle-outline" size={16} color="#b22300" />
              <Text style={styles.melhorTexto}>
                Maior progresso:{' '}
                <Text style={{ fontWeight: '800', color: '#1b1c16' }}>
                  {melhorItem.alimento?.nome}
                </Text>{' '}
                — {melhorItem.etapas_concluidas.length}/6 etapas
              </Text>
            </View>
          )}
        </View>

        {/* Conquistas */}
        <Secao titulo="Conquistas" icone="trophy-outline" iniciarAberta>
          {conquistasCompletas.length > 0 ? (
            <View style={styles.conquistasGrid}>
              {conquistasCompletas.map(s => (
                <View key={s.alimento_id} style={styles.conquistaCard}>
                  <View style={styles.conquistaIcone}>
                    <MaterialCommunityIcons name="check-circle-outline" size={28} color="#b22300" />
                  </View>
                  <Text style={styles.conquistaNome}>{s.alimento?.nome}</Text>
                  <Text style={styles.conquistaData}>{formatarData(s.created_at)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.semDadosBox}>
              <MaterialCommunityIcons name="trophy-outline" size={32} color="#c4c2b8" />
              <Text style={styles.semDadosTexto}>
                As conquistas aparecerão aqui quando a criança completar todas as etapas da trilha SOS com um alimento.
              </Text>
            </View>
          )}
        </Secao>

        {/* Alimentos Recusados */}
        <Secao titulo="Alimentos Recusados" icone="food-off-outline">
          {alimentosRecusados.length > 0 ? (
            <View style={styles.conquistasGrid}>
              {alimentosRecusados.map(s => (
                <View key={s.alimento_id} style={styles.conquistaCard}>
                  <View style={[styles.conquistaIcone, { backgroundColor: '#f0eee4' }]}>
                    <MaterialCommunityIcons name="close-circle-outline" size={28} color="#5e5c54" />
                  </View>
                  <Text style={styles.conquistaNome}>{s.alimento?.nome}</Text>
                  <Text style={styles.conquistaData}>{formatarData(s.created_at)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.semDadosBox}>
              <MaterialCommunityIcons name="emoticon-happy-outline" size={32} color="#c4c2b8" />
              <Text style={styles.semDadosTexto}>Nenhum alimento recusado até agora.</Text>
            </View>
          )}
        </Secao>

        {/* Detalhes para terapeuta */}
        <Secao titulo="Detalhes para o Terapeuta" icone="stethoscope">

          {/* Análise clínica */}
          {carregandoAnalise ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#904c1f" />
              <Text style={styles.loadingText}>Gerando análise clínica...</Text>
            </View>
          ) : analise ? (
            <>
              <View style={styles.detalheLabelRow}>
                <Text style={[styles.detalheLabel, { marginBottom: 0, marginTop: 0 }]}>ANÁLISE CLÍNICA</Text>
                <TouchableOpacity
                  onPress={() => carregarAnalise(true)}
                  disabled={carregandoAnalise}
                  activeOpacity={0.7}
                  style={styles.refreshBtn}
                >
                  <MaterialCommunityIcons name="refresh" size={16} color="#904c1f" />
                </TouchableOpacity>
              </View>
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
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.recarregarBox}
              onPress={() => carregarAnalise()}
            >
              <MaterialCommunityIcons name="refresh" size={18} color="#b22300" />
              <Text style={styles.recarregarText}>Gerar análise clínica</Text>
            </TouchableOpacity>
          )}

          {/* Dados da criança */}
          {(alergias || neuro) && (
            <View style={styles.dadosBox}>
              {alergias ? (
                <View style={styles.dadosItem}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#b22300" />
                  <Text style={styles.dadosTexto}>
                    <Text style={{ fontWeight: '700' }}>Alergias:</Text> {alergias}
                  </Text>
                </View>
              ) : null}
              {neuro ? (
                <View style={styles.dadosItem}>
                  <MaterialCommunityIcons name="brain" size={15} color="#904c1f" />
                  <Text style={styles.dadosTexto}>
                    <Text style={{ fontWeight: '700' }}>Neurodivergência:</Text> {neuro}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* ─── Histórico de Sessão ─────────────────────────────────────── */}
          <Text style={styles.detalheLabel}>HISTÓRICO DE SESSÃO</Text>

          {carregandoHistorico ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#904c1f" />
              <Text style={styles.loadingText}>Carregando histórico...</Text>
            </View>
          ) : historicoIA.length > 0 ? (
            historicoIA.map(s => {
              const pct = calcProgresso(s.etapas_concluidas);
              return (
                <View key={s.alimento_id} style={styles.sessaoCard}>
                  {/* Cabeçalho do card */}
                  <View style={styles.sessaoHeader}>
                    <View style={styles.sessaoInfo}>
                      <Text style={styles.sessaoAlimento}>{s.alimento?.nome}</Text>
                      <Text style={styles.sessaoData}>{formatarData(s.created_at)}</Text>
                    </View>
                    {s.etapa_atual === 'Recusado' ? (
                      <View style={styles.recusadoBadge}>
                        <Text style={styles.recusadoBadgeText}>Recusado</Text>
                      </View>
                    ) : (
                      <View style={[styles.pctBadge, pct >= 80 && styles.pctBadgeAlto]}>
                        <Text style={[styles.pctText, pct >= 80 && styles.pctTextClaro]}>
                          {pct}%
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Motivo da sugestão da IA */}
                  {s.justificativa_ia ? (
                    <Text style={styles.justificativaText}>{s.justificativa_ia}</Text>
                  ) : null}

                  {/* Chips de etapas SOS */}
                  <View style={styles.etapasWrap}>
                    {STATUS_DISPLAY.map(({ key, label }) => {
                      const feita   = s.etapas_concluidas.includes(key);
                      // etapa_atual = última etapa concluída; destaca com borda quando não é Comer
                      const ehAtual = s.etapa_atual === key && key !== 'Comer' && feita;
                      return (
                        <View
                          key={key}
                          style={[
                            styles.etapaChip,
                            feita    && styles.etapaChipFeita,
                            ehAtual  && styles.etapaChipAtual,
                          ]}
                        >
                          <Text style={[styles.etapaChipText, feita && styles.etapaChipTextFeita]}>
                            {label}
                          </Text>
                        </View>
                      );
                    })}
                    {s.etapas_concluidas.includes('Recusado') && (
                      <View style={[styles.etapaChip, styles.etapaChipRecusado]}>
                        <Text style={[styles.etapaChipText, styles.etapaChipTextFeita]}>
                          Recusado
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.semDadosBox}>
              <MaterialCommunityIcons name="food-off-outline" size={32} color="#c4c2b8" />
              <Text style={styles.semDadosTexto}>
                Nenhum alimento sugerido pela IA ainda. Gere sugestões na tela inicial para começar a jornada!
              </Text>
            </View>
          )}

          {/* Método */}
          <Text style={[styles.detalheLabel, { marginTop: 16 }]}>MÉTODO</Text>
          <View style={styles.metodoBox}>
            <View style={styles.metodoItem}>
              <MaterialCommunityIcons name="link-variant" size={15} color="#904c1f" />
              <Text style={styles.metodoTexto}>
                Food Chaining — sugestão baseada em preferências existentes
              </Text>
            </View>
            <View style={styles.metodoItem}>
              <MaterialCommunityIcons name="hand-wave-outline" size={15} color="#904c1f" />
              <Text style={styles.metodoTexto}>
                SOS Feeding — 6 etapas sensoriais progressivas
              </Text>
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
          <MaterialCommunityIcons
            name={gerandoPDF ? 'loading' : 'file-pdf-box'}
            size={22}
            color="#fff"
          />
          <Text style={styles.pdfBtnText}>
            {gerandoPDF ? 'Gerando...' : 'Exportar'}
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerSuper: { fontSize: 11, fontWeight: '700', color: '#904c1f', letterSpacing: 1.5, marginBottom: 4 },
  headerTitulo: { fontSize: 26, fontWeight: '800', color: '#1b1c16', letterSpacing: -0.5 },
  headerIdade: { fontSize: 13, color: '#904c1f', fontWeight: '600', marginTop: 4 },
  headerIcone: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ffdbc9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  resumoCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#4b4944',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#f6f4ea', borderRadius: 16, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#b22300', marginBottom: 2 },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#5e5c54', letterSpacing: 1, textAlign: 'center' },
  melhorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff5f3',
    borderRadius: 12,
    padding: 12,
  },
  melhorTexto: { flex: 1, fontSize: 13, color: '#5e5c54', lineHeight: 18 },

  conquistasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  conquistaCard: {
    width: '47%',
    borderRadius: 14,
    backgroundColor: '#f6f4ea',
    padding: 12,
    alignItems: 'center',
  },
  conquistaIcone: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffdbc9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  conquistaNome: { fontSize: 12, fontWeight: '700', color: '#1b1c16', textAlign: 'center' },
  conquistaData: { fontSize: 11, color: '#5e5c54', marginTop: 2 },

  semDadosBox: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  semDadosTexto: { fontSize: 13, color: '#5e5c54', textAlign: 'center', lineHeight: 20 },

  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  loadingText: { fontSize: 13, color: '#904c1f' },

  padraoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f6f4ea',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#b22300',
  },
  padraoTexto: { flex: 1, fontSize: 13, color: '#1b1c16', lineHeight: 20 },

  analiseBox: {
    backgroundColor: '#f6f4ea',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#b22300',
  },
  analiseResumo: { fontSize: 13, color: '#1b1c16', lineHeight: 22 },

  recomendacaoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#ffdbc9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  recomendacaoTexto: { flex: 1, fontSize: 13, color: '#904c1f', lineHeight: 20 },

  recarregarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#fff5f3',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(178,35,0,0.15)',
    marginBottom: 16,
  },
  recarregarText: { fontSize: 14, fontWeight: '700', color: '#b22300' },

  dadosBox: { backgroundColor: '#fff5f3', borderRadius: 14, padding: 14, marginBottom: 16, gap: 8 },
  dadosItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dadosTexto: { flex: 1, fontSize: 13, color: '#1b1c16', lineHeight: 20 },

  detalheLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#904c1f',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 4,
  },
  detalheLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  refreshBtn: { padding: 4 },

  sessaoCard: { backgroundColor: '#f6f4ea', borderRadius: 14, padding: 14, marginBottom: 8 },
  sessaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sessaoInfo: { flex: 1 },
  sessaoAlimento: { fontSize: 14, fontWeight: '700', color: '#1b1c16' },
  sessaoData: { fontSize: 11, color: '#5e5c54', marginTop: 2 },
  pctBadge: { backgroundColor: '#e4e3d9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  pctBadgeAlto: { backgroundColor: '#b22300' },
  pctText: { fontSize: 12, fontWeight: '800', color: '#5e5c54' },
  pctTextClaro: { color: '#fff' },
  recusadoBadge: { backgroundColor: '#5e5c54', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  recusadoBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  justificativaText: {
    fontSize: 11,
    color: '#904c1f',
    lineHeight: 16,
    marginBottom: 8,
    fontStyle: 'italic',
  },

  etapasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  etapaChip: { backgroundColor: '#e4e3d9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  // Etapa concluída — preenchimento vermelho
  etapaChipFeita: { backgroundColor: '#b22300' },
  // Última etapa concluída (onde a criança parou) — borda branca sobre o vermelho
  etapaChipAtual: { borderWidth: 2, borderColor: '#fff' },
  // Alimento recusado
  etapaChipRecusado: { backgroundColor: '#5e5c54' },
  etapaChipText: { fontSize: 10, color: '#5e5c54', fontWeight: '600' },
  etapaChipTextFeita: { color: '#fff' },

  metodoBox: { backgroundColor: '#f6f4ea', borderRadius: 14, padding: 14, gap: 10 },
  metodoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metodoTexto: { flex: 1, fontSize: 13, color: '#5e5c54', lineHeight: 20 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    backgroundColor: '#fcf9ef',
  },
  pdfBtn: {
    backgroundColor: '#b22300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 100,
    elevation: 4,
    shadowColor: '#b22300',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  pdfBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  footerNota: { textAlign: 'center', fontSize: 12, color: '#5e5c54', marginTop: 10 },
});
