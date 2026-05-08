import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://ipv4:8000';
const CACHE_HORAS = 6;

export type SugestaoAlimento = {
  id: string;
  nome: string;
  motivo: string;
  categoria: string | null;
  textura: string | null;
  cor: string | null;
  forma_preparo: string | null;
  status: string | null;
};

export type AnaliseRelatorio = {
  resumo_clinico: string;
  padroes_aceitacao: string[];
  recomendacao: string;
};

/**
 * Busca sugestões de alimentos baseadas no método Food Chaining.
 * Usa cache de 6h por padrão. Passe forceRefresh=true para ignorar o cache
 * (usado pelo botão "Sugerir Novos Alimentos" após recusa ou conclusão).
 */
export async function obterSugestoesFoodChaining(criancaId: string, forceRefresh = false): Promise<SugestaoAlimento[]> {
  const cacheKey = `@juca:sugestoes:${criancaId}`;

  if (!forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const horas = (Date.now() - timestamp) / 1000 / 3600;
        if (horas < CACHE_HORAS) {
          console.log('Sugestões carregadas do cache!');
          return data;
        }
      }
    } catch { }
  }

  try {
    const response = await fetch(`${BACKEND_URL}/ia/sugestao-food-chaining/${criancaId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    });

    if (!response.ok) {
      throw new Error(`Erro no servidor: ${response.status}`);
    }

    const data = await response.json();

    // Limpeza de markdown caso o modelo retorne blocos de código
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    const cleanText = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    const sugestoes = parsed.sugestoes as SugestaoAlimento[];

    // Salva no cache
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: sugestoes, timestamp: Date.now() }));
    } catch { }

    return sugestoes;
  } catch (error) {
    console.error('Erro ao obter sugestões:', error);
    return []; // Retorna lista vazia para não quebrar o layout
  }
}

export async function atualizarStatusNoCacheSugestoes(
  criancaId: string,
  alimentoId: string,
  status: string,
): Promise<void> {
  const cacheKey = `@juca:sugestoes:${criancaId}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return;
    const { data, timestamp } = JSON.parse(cached);
    const atualizado = (data as SugestaoAlimento[]).map((s) =>
      s.id === alimentoId ? { ...s, status } : s,
    );
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: atualizado, timestamp }));
  } catch { }
}

export async function gerarAnaliseRelatorio(criancaId: string, force = false): Promise<AnaliseRelatorio> {
  try {
    const url = `${BACKEND_URL}/ia/analise-relatorio/${criancaId}${force ? '?force=true' : ''}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    });

    if (!response.ok) {
      throw new Error(`Erro no servidor: ${response.status}`);
    }

    const data = await response.json();

    // Limpeza de markdown caso o modelo retorne blocos de código
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    const cleanText = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    return parsed as AnaliseRelatorio;
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    throw error;
  }
}