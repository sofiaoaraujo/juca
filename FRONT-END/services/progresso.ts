import api from './api';

// Mapeia ids da Trilha SOS visual (home.tsx) para os status canônicos
// aceitos pelo backend (schemas/progresso.py).
const ETAPA_TO_STATUS: Record<string, string> = {
  tolerar:   'Tolerar',
  interagir: 'Interagir',
  cheirar:   'Cheirar',
  beijar:    'Tocar',     // beijar/lamber pertence ao nível "Tocar" (lábios/língua)
  morder:    'Saborear',  // morder pertence ao nível "Saborear"
  comer:     'Comer',
};

// Mapeia status do backend de volta para ids visuais
const STATUS_TO_ETAPA: Record<string, string> = {
  'Tolerar':   'tolerar',
  'Interagir': 'interagir',
  'Cheirar':   'cheirar',
  'Tocar':     'beijar',
  'Saborear':  'morder',
  'Comer':     'comer',
};

/**
 * Salva UMA etapa SOS individual via API backend.
 * Usado pelo auto-save quando o usuário completa cada etapa.
 */
export async function salvarEtapaSOS(
  criancaId: string,
  alimentoId: string,
  etapaId: string,
): Promise<boolean> {
  const status = ETAPA_TO_STATUS[etapaId];
  if (!status) return false;
  try {
    await api.post('/progresso/', {
      crianca_id: criancaId,
      alimento_id: alimentoId,
      status,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Busca as etapas já concluídas via API backend (bypassa RLS).
 * Retorna array de ids visuais (ex: ['tolerar', 'interagir']).
 */
export async function buscarEtapasSalvas(
  criancaId: string,
  alimentoId: string,
): Promise<string[]> {
  try {
    const { data } = await api.get<string[]>(
      `/progresso/crianca/${criancaId}/alimento/${alimentoId}/etapas`,
    );
    return (data ?? []).map(s => STATUS_TO_ETAPA[s]).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Registra múltiplas etapas SOS em lote (usado pelo login/onboarding).
 */
export async function registrarEtapasSOS(params: {
  criancaId: string;
  alimentoId: string;
  etapasIds: string[];
}) {
  const { criancaId, alimentoId, etapasIds } = params;
  for (const etapaId of etapasIds) {
    const status = ETAPA_TO_STATUS[etapaId];
    if (!status) continue;
    await api.post('/progresso/', {
      crianca_id: criancaId,
      alimento_id: alimentoId,
      status,
    });
  }
}
