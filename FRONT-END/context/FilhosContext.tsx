import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';

// TODO: login
const DEV_CUIDADOR_ID = 'de8ea771-326e-470c-a2a3-f2ef5425a53f'; 

export type Filho = {
  id: string;
  nome: string;
  dataNasc: string;
  sexo: string;
  alergias: string;
  neuro: string;
  alimentosSelecionados: string[];
  criadoEm: string;
};

type FilhosContextType = {
  filhos: Filho[];
  filhoAtivo: Filho | null;
  carregando: boolean;
  setFilhoAtivo: (filho: Filho) => Promise<void>;
  adicionarFilho: (dados: Omit<Filho, 'id' | 'criadoEm'>) => Promise<Filho>;
  editarFilho: (id: string, dados: Partial<Filho>) => Promise<void>;
  removerFilho: (id: string) => Promise<void>;
  recarregar: () => Promise<void>;
};


const FilhosContext = createContext<FilhosContextType | null>(null);

const STORAGE_KEY = '@juca:filhos';
const ATIVO_KEY = '@juca:filhoAtivoId';

// Converte "YYYY-MM-DD" → "DD/MM/YYYY"
function converterData(dataApi: string | null): string {
  if (!dataApi) return '';
  const [ano, mes, dia] = dataApi.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Mapeia resposta da API para o tipo Filho (sem alergias/neuro ainda)
function mapearFilho(dados: any): Filho {
  return {
    id: dados.id,
    nome: dados.nome,
    dataNasc: converterData(dados.data_nascimento),
    sexo: dados.sexo ?? '',
    alergias: '',
    neuro: '',
    alimentosSelecionados: [],
    criadoEm: dados.created_at,
  };
}

// Busca alergias e neuro do filho ativo (opção 2: request por ID)
async function buscarDetalhes(id: string): Promise<{ alergias: string; neuro: string }> {
  const [resAlergias, resNeuro] = await Promise.all([
    api.get(`/criancas-alergias/crianca/${id}`),
    api.get(`/criancas-neurodivergencias/${id}`),
  ]);

  const alergias = resAlergias.data
    .map((a: any) => a.alergia?.nome)
    .filter(Boolean)
    .join(', ');

  const neuroNomes = await Promise.all(
    resNeuro.data.map((n: any) =>
      api.get(`/neurodivergencias/${n.neurodivergencia_id}`).then(r => r.data.neurodivergencia)
    )
  );
  const neuro = neuroNomes.join(', ');

  return { alergias, neuro };
}

export function FilhosProvider({ children }: { children: React.ReactNode }) {
  const [filhos, setFilhos] = useState<Filho[]>([]);
  const [filhoAtivo, setFilhoAtivoState] = useState<Filho | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Carrega do storage
  const recarregar = useCallback(async () => {
    try {
      const res = await api.get(`/criancas/cuidador/${DEV_CUIDADOR_ID}`);
      const lista: Filho[] = res.data.map(mapearFilho);
      setFilhos(lista);

      if (lista.length > 0) {
        const ativoId = await AsyncStorage.getItem(ATIVO_KEY);
        const base = lista.find(f => f.id === ativoId) ?? lista[0];
        const detalhes = await buscarDetalhes(base.id);
        setFilhoAtivoState({ ...base, ...detalhes });
      }
    } catch (e) {
      console.error('Erro ao carregar filhos:', e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { recarregar(); }, []);

  // Trocar filho ativo
  const setFilhoAtivo = useCallback(async (filho: Filho) => {
    const detalhes = await buscarDetalhes(filho.id);
    const completo = { ...filho, ...detalhes };
    setFilhoAtivoState(completo);
    await AsyncStorage.setItem(ATIVO_KEY, filho.id);
  }, []);


  // Adicionar filho
  const adicionarFilho = useCallback(async (dados: Omit<Filho, 'id' | 'criadoEm'>) => {
    const novo: Filho = {
      ...dados,
      id: Date.now().toString(),
      criadoEm: new Date().toISOString(),
    };
    const novaLista = [...filhos, novo];
    setFilhos(novaLista);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novaLista));
    await AsyncStorage.setItem(ATIVO_KEY, novo.id);
    setFilhoAtivoState(novo);
    return novo;
  }, [filhos]);

  // Editar filho
  const editarFilho = useCallback(async (id: string, dados: Partial<Filho>) => {
    const novaLista = filhos.map(f => f.id === id ? { ...f, ...dados } : f);
    setFilhos(novaLista);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novaLista));
    if (filhoAtivo?.id === id) {
      const atualizado = novaLista.find(f => f.id === id)!;
      setFilhoAtivoState(atualizado);
    }
  }, [filhos, filhoAtivo]);

  // Remover filho
  const removerFilho = useCallback(async (id: string) => {
    const novaLista = filhos.filter(f => f.id !== id);
    setFilhos(novaLista);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novaLista));
    if (filhoAtivo?.id === id) {
      const proximo = novaLista[0] ?? null;
      setFilhoAtivoState(proximo);
      if (proximo) await AsyncStorage.setItem(ATIVO_KEY, proximo.id);
      else await AsyncStorage.removeItem(ATIVO_KEY);
    }
  }, [filhos, filhoAtivo]);

  return (
    <FilhosContext.Provider value={{
      filhos, filhoAtivo, carregando,
      setFilhoAtivo, adicionarFilho, editarFilho, removerFilho, recarregar,
    }}>
      {children}
    </FilhosContext.Provider>
  );
}


export function useFilhos() {
  const ctx = useContext(FilhosContext);
  if (!ctx) throw new Error('useFilhos deve ser usado dentro de FilhosProvider');
  return ctx;
}