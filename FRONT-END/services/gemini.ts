import AsyncStorage from '@react-native-async-storage/async-storage';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const CACHE_HORAS = 6;

export type SugestaoAlimento = {
  id: string;
  nome: string;
  motivo: string;
  categoria: string;
  textura: string;
  cor: string;
};

export type AnaliseRelatorio = {
  resumo_clinico: string;
  padroes_aceitacao: string[];
  recomendacao: string;
};

// ─── Sugestão Food Chaining ───────────────────────────────────────────────────
export async function obterSugestoesFoodChaining(
  nomeFilho: string,
  alergias: string,
  neuro: string,
  alimentosAceitos: string[]
): Promise<SugestaoAlimento[]> {

  // ── Verifica cache ────────────────────────────────────────────────────────
  const cacheKey = `@juca:sugestoes:v2:${nomeFilho}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const horas = (Date.now() - timestamp) / 1000 / 3600;
      if (horas < CACHE_HORAS) {
        console.log('Sugestões do cache!');
        return data;
      }
    }
  } catch {}
  // ─────────────────────────────────────────────────────────────────────────
  const prompt = `
Você é um nutricionista especialista em Food Chaining para crianças com dificuldades alimentares.

Dados da criança:
- Nome: ${nomeFilho}
- Alergias/Restrições: ${alergias || 'Nenhuma'}
- Neurodivergência: ${neuro || 'Nenhuma'}
- Alimentos que já aceita: ${alimentosAceitos.length > 0 ? alimentosAceitos.join(', ') : 'Ainda não informado'}

Sua tarefa: Aplique o método Food Chaining. Sugira exatamente 2 alimentos que a criança ainda não come, mas que possuem textura, cor, sabor ou forma similares aos que ela já aceita. Considere as alergias como restrições absolutas.

Retorne SOMENTE um JSON válido, sem texto adicional, sem markdown, sem explicações:
{
  "sugestoes": [
    {
      "id": "1",
      "nome": "nome do alimento em português",
      "motivo": "frase curta explicando a conexão sensorial com o que já aceita",
      "categoria": "Fruta | Legume | Verdura | Proteína | Carboidrato | Laticínio",
      "textura": "macio | crocante | cremoso | firme",
      "cor": "cor predominante do alimento"
    }
  ]
}
`;

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.4,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    console.log('Erro Gemini detalhes:', JSON.stringify(errorBody));
    throw new Error(`Erro na API do Gemini: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error('Resposta vazia do Gemini');

  const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  const sugestoes = parsed.sugestoes as SugestaoAlimento[];

  // Salva no cache
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: sugestoes, timestamp: Date.now() }));
  } catch {}

  return sugestoes;
}

// ─── Análise Clínica para Relatório ──────────────────────────────────────────
export async function gerarAnaliseRelatorio(
  nomeFilho: string,
  sessoes: { alimento: string; textura: string; etapasConcluidas: string[]; totalEtapas: number }[]
): Promise<AnaliseRelatorio> {
  const historicoFormatado = sessoes.map(s => ({
    alimento: s.alimento,
    textura: s.textura,
    etapas_concluidas: s.etapasConcluidas.length,
    total_etapas: s.totalEtapas,
    percentual: Math.round((s.etapasConcluidas.length / s.totalEtapas) * 100),
  }));

  const prompt = `
Analise o histórico abaixo de uma criança em terapia alimentar pelo método SOS Feeding:

Criança: ${nomeFilho}
Histórico: ${JSON.stringify(historicoFormatado)}

Identifique padrões de evolução ou estagnação nas texturas e alimentos.
Seja claro e objetivo para um terapeuta ocupacional ou fonoaudiólogo.

Retorne SOMENTE um JSON válido, sem texto adicional:
{
  "resumo_clinico": "resumo em 2-3 frases sobre o progresso geral",
  "padroes_aceitacao": ["padrão 1", "padrão 2", "padrão 3"],
  "recomendacao": "recomendação principal para o próximo período"
}
`;

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro na API do Gemini: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error('Resposta vazia do Gemini');

  const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  return parsed as AnaliseRelatorio;
}