import api from './api';
import { supabase } from './supabase';

export type HistoricoIAItem = {
  alimento_id: string;
  alimento: {
    id: string;
    nome: string;
    textura?: string;
    cor?: string;
    sabor?: string;
  } | null;
  etapas_concluidas: string[];
  etapa_atual: string;
  justificativa_ia?: string | null;
  created_at: string;
};

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
    return (data ?? []).map((s: string) => STATUS_TO_ETAPA[s]).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Busca os alimentos sugeridos pela IA para uma criança com o progresso
 * consolidado na trilha SOS (todas as etapas concluídas e etapa atual).
 */
export async function buscarHistoricoIA(criancaId: string): Promise<HistoricoIAItem[]> {
  try {
    const { data } = await api.get<HistoricoIAItem[]>(
      `/progresso/crianca/${criancaId}/historico-ia`,
    );
    return data ?? [];
  } catch {
    return [];
  }
}

/**
 * Encerra a tentativa com um alimento registrando status "Recusado".
 */
export async function recusarAlimento(
  criancaId: string,
  alimentoId: string,
): Promise<boolean> {
  try {
    await api.post('/progresso/recusar', {
      crianca_id: criancaId,
      alimento_id: alimentoId,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Faz upload da foto da conquista "Comer" para o bucket galeria_conquistas
 * e persiste a URL pública na coluna foto_url da tabela crianca_alimento.
 */
export async function uploadFotoConquista(
  localUri: string,
  criancaId: string,
  alimentoId: string,
): Promise<string | null> {
  try {
    const ext = localUri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
    const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    const filePath = `${criancaId}/${alimentoId}_${Date.now()}.${ext}`;

    const arraybuffer = await fetch(localUri).then(r => r.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('galeria_conquistas')
      .upload(filePath, arraybuffer, { contentType, upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('galeria_conquistas')
      .getPublicUrl(filePath);

    const fotoUrl = urlData.publicUrl;

    await api.patch('/progresso/foto', {
      crianca_id: criancaId,
      alimento_id: alimentoId,
      foto_url: fotoUrl,
    });

    return fotoUrl;
  } catch (e) {
    console.error('Erro ao fazer upload da foto conquista:', e);
    return null;
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
