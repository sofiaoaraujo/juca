import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';

// TODO : ! AINDA PRECISAMOS DO LOGIN, O ID DAQUI É O UUID GERADO NO CADASTRO !
import { supabase } from '../services/supabase';

// ! SE TIVER DANDO ERRADO USE O ID FIXO DE UM CUIDADOR QUE VOCÊ ENCONTROU NO BANCO DE DADOS, SÓ PRA TESTAR MESMO
// ! E VÁ PARA A LINHA recarregar, lá terá mais intruções
// * const DEV_CUIDADOR_ID = '94d656c5-513f-49bd-bb8b-e005f33c9b29'; 

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

// Busca alergias e neuro do filho ativo (request por ID)// ! Pode pensar substituir por join algumas partes para otimizar
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

  // Carrega 
   const recarregar = useCallback(async () => {
    try {

      // * -----------------------
      const { data: { user } } = await supabase.auth.getUser();  // ! Se estiver dando errado, troque essas duas por e lá em cima habilite o código perto dos imports
      if (!user) return;                                         // "const res = await api.get(`/criancas/cuidador/${DEV_CUIDADOR_ID}`);"
      // * -----------------------
      const res = await api.get(`/criancas/cuidador/${user.id}`);
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


  // Adicionar filho // ! MODIFICAR DEPOIS, PROCURAR REMOVER ISSO E TROCAR POR REQUISIÇÃO POST PRA API, AQUI É SÓ PROTOTIPO RÁPIDO
                    // ! E TIRAR O POST DO INDEX, TORNAR AQUI PORTANTO O ÚNICO LUGAR RESPONSÁVEL POR ADICIONAR FILHOS, PARA CENTRALIZAR A LÓGICA DE ATUALIZAÇÃO DO CONTEXTO 
  const adicionarFilho = useCallback(async (dados: Omit<Filho, 'id' | 'criadoEm'>) => {
    const novo: Filho = {
      ...dados,
      id: Date.now().toString(),
      criadoEm: new Date().toISOString(),
    };
    const novaLista = [...filhos, novo];
    setFilhos(novaLista);
    await AsyncStorage.setItem(ATIVO_KEY, novo.id);
    setFilhoAtivoState(novo);
    return novo;
  }, [filhos]);

  // Editar filho
  const editarFilho = useCallback(async (id: string, dados: Partial<Filho>) => {
    const novaLista = filhos.map(f => f.id === id ? { ...f, ...dados } : f);
    setFilhos(novaLista);
    if (filhoAtivo?.id === id) {
      const atualizado = novaLista.find(f => f.id === id)!;
      setFilhoAtivoState(atualizado);
    }
  }, [filhos, filhoAtivo]);

  // Remover filho
  const removerFilho = useCallback(async (id: string) => {
    await api.delete(`/criancas/${id}`);
    await recarregar();
  }, [recarregar]);


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