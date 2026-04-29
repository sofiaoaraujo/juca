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
