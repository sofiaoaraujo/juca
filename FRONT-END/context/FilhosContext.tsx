import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

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

export function FilhosProvider({ children }: { children: React.ReactNode }) {
  const [filhos, setFilhos] = useState<Filho[]>([]);
  const [filhoAtivo, setFilhoAtivoState] = useState<Filho | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Carrega do storage (MODIFICADO PARA TESTE FORÇADO COM O SUPABASE)
  const recarregar = useCallback(async () => {
    try {
      // 🚨 MODO DE TESTE ABSOLUTO: IGNORANDO O CELULAR 🚨
      // Criamos o filho ativo diretamente aqui, usando o seu ID do Supabase.
      
      const filhoTeste: Filho = {
        id: "5fb9709a-a394-4e4e-a682-4212b1366ab4", // O SEU ID REAL DO SUPABASE! // ID mockado por enquanto
        nome: "Mikael (Teste Banco)",
        dataNasc: "01/01/2020",
        sexo: "Masculino",
        alergias: "",
        neuro: "",
        alimentosSelecionados: [],
        criadoEm: new Date().toISOString(),
      };

      // Força a lista a ter apenas este filho de teste
      const lista = [filhoTeste];
      
      // Atualiza o estado
      setFilhos(lista);
      setFilhoAtivoState(filhoTeste);

      // Salva no celular para não perder e sobrescrever o lixo antigo
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
      await AsyncStorage.setItem(ATIVO_KEY, filhoTeste.id);

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

  // Adicionar filho (AGORA GERA UM UUID REAL DO TIPO BANCO DE DADOS)
  const adicionarFilho = useCallback(async (dados: Omit<Filho, 'id' | 'criadoEm'>) => {
    const novo: Filho = {
      ...dados,
      id: Crypto.randomUUID(), // <-- SOLUÇÃO DEFINITIVA PARA NOVOS CADASTROS
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