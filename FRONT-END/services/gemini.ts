// services/gemini.ts
// Substitua pelo IP que você encontrou no Passo 1!
const BACKEND_URL = 'http://192.168.0.3:8000'; 

export type SugestaoAlimento = {
  id: string;
  nome: string;
  motivo: string;
  categoria: string | null;
  textura: string | null;
  cor: string | null;
  forma_preparo: string | null;
  // Presente apenas quando a API retorna do cache (trilha SOS em andamento).
  // Valores: "Tolerar" | "Interagir" | "Cheirar" | "Tocar" | "Saborear"
  status: string | null;
};

export type AnaliseRelatorio = {
  resumo_clinico: string;
  padroes_aceitacao: string[];
  recomendacao: string;
};

// ─── Sugestão Food Chaining (Via Back-end) ──────────────────────────────────
export async function obterSugestoesFoodChaining(criancaId: string): Promise<SugestaoAlimento[]> {
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
  
  return parsed.sugestoes as SugestaoAlimento[];
}

// ─── Análise Clínica para Relatório (Via Back-end) ──────────────────────────
export async function gerarAnaliseRelatorio(criancaId: string, force = false): Promise<AnaliseRelatorio> {
  const url = `${BACKEND_URL}/ia/analise-relatorio/${criancaId}${force ? '?force=true' : ''}`;
  const response = await fetch(url, {
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