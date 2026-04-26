import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ Substitua pelo IP do seu computador (rode `ip addr` no terminal)
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://192.168.1.8:8000';
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

// ─── Sugestão Food Chaining (Via Back-end) ───────────────────────────────────
export async function obterSugestoesFoodChaining(criancaId: string): Promise<SugestaoAlimento[]> {
  // Verifica cache
  const cacheKey = `@juca:sugestoes:v2:${criancaId}`;
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

  const response = await fetch(`${BACKEND_URL}/ia/sugestao-food-chaining/${criancaId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Erro no Back-end: ${response.status}`);
  }

  const data = await response.json();
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  const sugestoes = parsed.sugestoes as SugestaoAlimento[];

  // Salva no cache
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: sugestoes, timestamp: Date.now() }));
  } catch {}

  return sugestoes;
}

// ─── Análise Clínica para Relatório (Via Back-end) ───────────────────────────
export async function gerarAnaliseRelatorio(criancaId: string): Promise<AnaliseRelatorio> {
  const response = await fetch(`${BACKEND_URL}/ia/analise-relatorio/${criancaId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Erro no Back-end: ${response.status}`);
  }

  const data = await response.json();
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

  return parsed as AnaliseRelatorio;
}