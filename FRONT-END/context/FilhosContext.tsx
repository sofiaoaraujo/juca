import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

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

/**
 * Busca os filhos do cuidador autenticado diretamente do Supabase.
 * Reutilizada pelo contexto (fallback) e pelo login.
 */
export async function buscarFilhosDoSupabase(userId: string): Promise<Filho[]> {
  const { data: criancas } = await supabase
    .from('criancas')
    .select('id, nome, data_nascimento, sexo')
    .eq('cuidador_id', userId);

  return Promise.all((criancas ?? []).map(async (c: any) => {
    const { data: progressos } = await supabase
      .from('crianca_alimento')
      .select('alimentos(nome)')
      .eq('crianca_id', c.id);

    const alimentosSelecionados = [...new Set(
      (progressos ?? []).map((p: any) => p.alimentos?.nome).filter(Boolean)
    )] as string[];

    return {
      id: c.id,
      nome: c.nome ?? '',
      dataNasc: c.data_nascimento
        ? c.data_nascimento.split('-').reverse().join('/')
        : '',
      sexo: c.sexo ?? '',
      alergias: '',
      neuro: '',
      alimentosSelecionados,
      criadoEm: c.data_nascimento ?? new Date().toISOString(),
    };
  }));
}

type FilhosContextType = {
  filhos: Filho[];
  filhoAtivo: Filho | null;
  carregando: boolean;
  setFilhoAtivo: (filho: Filho) => Promise<void>;
  adicionarFilho: (dados: Omit<Filho, 'id' | 'criadoEm'>, id?: string) => Promise<Filho>;
  editarFilho: (id: string, dados: Partial<Filho>) => Promise<void>;
  removerFilho: (id: string) => Promise<void>;
  recarregar: () => Promise<void>;
  injetarFilhos: (lista: Filho[]) => Promise<void>;
};

const FilhosContext = createContext<FilhosContextType | null>(null);

const STORAGE_KEY = '@juca:filhos';
const ATIVO_KEY = '@juca:filhoAtivoId';

export function FilhosProvider({ children }: { children: React.ReactNode }) {
  const [filhos, setFilhos] = useState<Filho[]>([]);
  const [filhoAtivo, setFilhoAtivoState] = useState<Filho | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      // TESTE: cache desabilitado temporariamente
      // const v = await AsyncStorage.getItem(STORAGE_KEY);
      // let lista: Filho[] = v ? JSON.parse(v) : [];
      let lista: Filho[] = [];

      // Fallback: se o cache local está vazio mas há sessão autenticada,
      // busca os filhos diretamente do Supabase e persiste localmente.
      if (lista.length === 0) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          try {
            lista = await buscarFilhosDoSupabase(session.user.id);
            if (lista.length > 0) {
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
            }
          } catch (e) {
            console.error('Erro ao buscar filhos do Supabase (fallback):', e);
          }
        }
      }

      setFilhos(lista);
      const ativoId = await AsyncStorage.getItem(ATIVO_KEY);
      const ativo = lista.find(f => f.id === ativoId) ?? lista[0] ?? null;
      setFilhoAtivoState(ativo);
    } catch (e) {
      console.error('Erro ao carregar filhos:', e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { recarregar(); }, []);

  // Trocar filho ativo
  const setFilhoAtivo = useCallback(async (filho: Filho) => {
    setFilhoAtivoState(filho);
    await AsyncStorage.setItem(ATIVO_KEY, filho.id);
  }, []);

  // Adicionar filho — usa o id do banco quando fornecido, senão gera um UUID local
  const adicionarFilho = useCallback(async (dados: Omit<Filho, 'id' | 'criadoEm'>, id?: string) => {
    const novo: Filho = {
      ...dados,
      id: id ?? Crypto.randomUUID(),
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
    const { error } = await supabase.from('criancas').delete().eq('id', id);
    if (error) throw new Error(error.message);

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

  // Injeta filhos vindos de fonte externa (ex: login com consulta ao Supabase)
  const injetarFilhos = useCallback(async (lista: Filho[]) => {
    setFilhos(lista);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    const ativo = lista[0] ?? null;
    setFilhoAtivoState(ativo);
    if (ativo) await AsyncStorage.setItem(ATIVO_KEY, ativo.id);
    else await AsyncStorage.removeItem(ATIVO_KEY);
  }, []);

  return (
    <FilhosContext.Provider value={{
      filhos, filhoAtivo, carregando,
      setFilhoAtivo, adicionarFilho, editarFilho, removerFilho, recarregar, injetarFilhos,
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