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
      const v = await AsyncStorage.getItem(STORAGE_KEY);
      const lista: Filho[] = v ? JSON.parse(v) : [];
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