from fastapi import APIRouter, HTTPException
from app.database import supabase
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv(override=True)

router = APIRouter(prefix="/ia", tags=["Inteligência Artificial"])

CHAVE_API = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent"
GEMINI_HEADERS = {"Content-Type": "application/json", "x-goog-api-key": CHAVE_API}

# ---------------------------------------------------------------------------
# Motor de Food Chaining (Sugestões para Home)
# ---------------------------------------------------------------------------
@router.post("/sugestao-food-chaining/{crianca_id}")
async def obter_sugestao(crianca_id: str):
    try:
        # ---------------------------------------------------------------------------
        # TRAVA DE GERAÇÃO: verifica trilha SOS ativa antes de chamar o LLM.
        # "Ativa" = sugestao_ia=true E status ainda não chegou em "Comer".
        # Se existir ao menos uma linha nesse estado, a trilha não terminou —
        # devolvemos o cache sem gastar quota da API.
        # ---------------------------------------------------------------------------
        sugestoes_em_andamento = (
            supabase.table("crianca_alimento")
            .select("status, justificativa_ia, alimentos(id, nome, textura, cor, sabor)")
            .eq("crianca_id", crianca_id)
            .eq("sugestao_ia", True)
            .neq("status", "Comer")
            .execute()
        )

        if sugestoes_em_andamento.data:
            print(f"[Food Chaining] Trilha SOS ativa encontrada para crianca_id={crianca_id}. Retornando cache sem chamar LLM.")
            sugestoes_cache = []
            for row in sugestoes_em_andamento.data:
                alimento = row.get("alimentos") or {}
                sugestoes_cache.append({
                    "id": alimento.get("id"),
                    "novo": False,
                    "nome": alimento.get("nome"),
                    "motivo": row.get("justificativa_ia"),
                    "forma_preparo": None,
                    "categoria": None,
                    "textura": alimento.get("textura"),
                    "cor": alimento.get("cor"),
                    "sabor": alimento.get("sabor"),
                    "status": row.get("status"),
                })
            return {"sugestoes": sugestoes_cache, "origem": "cache"}

        print(f"[Food Chaining] Sem trilha ativa para crianca_id={crianca_id}. Chamando LLM.")

        alergias_data = supabase.table("crianca_alergia").select("alergias(nome)").eq("crianca_id", crianca_id).execute()
        alergias_lista = [item['alergias']['nome'] for item in alergias_data.data if item.get('alergias')]

        historico_sucesso = (
            supabase.table("crianca_alimento")
            .select("alimentos(id, nome, textura, cor, sabor)")
            .eq("crianca_id", crianca_id)
            .eq("status", "Comer")
            .execute()
        )
        alimentos_aceitos = [h['alimentos'] for h in historico_sucesso.data if h.get('alimentos')]

        if not alimentos_aceitos:
            raise HTTPException(
                status_code=400,
                detail="A criança ainda não possui alimentos com status 'Comer'. Registre ao menos um alimento aceito antes de usar o Food Chaining.",
            )

        todos_na_trilha = (
            supabase.table("crianca_alimento")
            .select("alimento_id")
            .eq("crianca_id", crianca_id)
            .execute()
        )
        ids_na_trilha = [h['alimento_id'] for h in todos_na_trilha.data]

        SENSORY_DEFAULTS = {
            'maçã': {'textura': 'crocante', 'cor': 'vermelha', 'sabor': 'doce'},
            'maca': {'textura': 'crocante', 'cor': 'vermelha', 'sabor': 'doce'},
            'melancia': {'textura': 'aquosa', 'cor': 'vermelha', 'sabor': 'doce'},
            'banana': {'textura': 'macia', 'cor': 'amarela', 'sabor': 'doce'},
            'mamão': {'textura': 'macia', 'cor': 'laranja', 'sabor': 'doce'},
            'mamao': {'textura': 'macia', 'cor': 'laranja', 'sabor': 'doce'},
            'manga': {'textura': 'macia', 'cor': 'amarela', 'sabor': 'doce'},
            'pera': {'textura': 'crocante', 'cor': 'verde', 'sabor': 'doce'},
            'uva': {'textura': 'aquosa', 'cor': 'roxa', 'sabor': 'doce'},
            'morango': {'textura': 'macia', 'cor': 'vermelha', 'sabor': 'doce'},
            'cenoura': {'textura': 'crocante', 'cor': 'laranja', 'sabor': 'doce'},
            'brócolis': {'textura': 'firme', 'cor': 'verde', 'sabor': 'amargo'},
            'brocolis': {'textura': 'firme', 'cor': 'verde', 'sabor': 'amargo'},
            'abobrinha': {'textura': 'macia', 'cor': 'verde', 'sabor': 'neutro'},
            'beterraba': {'textura': 'firme', 'cor': 'roxa', 'sabor': 'doce'},
            'chuchu': {'textura': 'macia', 'cor': 'verde', 'sabor': 'neutro'},
            'arroz': {'textura': 'macia', 'cor': 'branca', 'sabor': 'neutro'},
            'batata': {'textura': 'macia', 'cor': 'amarela', 'sabor': 'neutro'},
            'batata-doce': {'textura': 'macia', 'cor': 'laranja', 'sabor': 'doce'},
            'macarrão': {'textura': 'macia', 'cor': 'amarela', 'sabor': 'neutro'},
            'macarrao': {'textura': 'macia', 'cor': 'amarela', 'sabor': 'neutro'},
            'mandioca': {'textura': 'firme', 'cor': 'branca', 'sabor': 'neutro'},
            'feijão': {'textura': 'macia', 'cor': 'marrom', 'sabor': 'salgado'},
            'feijao': {'textura': 'macia', 'cor': 'marrom', 'sabor': 'salgado'},
            'ovo': {'textura': 'macia', 'cor': 'amarela', 'sabor': 'neutro'},
            'frango': {'textura': 'firme', 'cor': 'bege', 'sabor': 'salgado'},
            'carne moída': {'textura': 'macia', 'cor': 'marrom', 'sabor': 'salgado'},
            'carne moida': {'textura': 'macia', 'cor': 'marrom', 'sabor': 'salgado'},
            'inhame': {'textura': 'macia', 'cor': 'branca', 'sabor': 'neutro'},
        }

        for alimento in alimentos_aceitos:
            if alimento:
                nome_lower = alimento.get('nome', '').lower().strip()
                defaults = SENSORY_DEFAULTS.get(nome_lower, {})
                if not alimento.get('textura') and defaults.get('textura'):
                    alimento['textura'] = defaults['textura']
                if not alimento.get('cor') and defaults.get('cor'):
                    alimento['cor'] = defaults['cor']
                if not alimento.get('sabor') and defaults.get('sabor'):
                    alimento['sabor'] = defaults['sabor']

        catalogo = supabase.table("alimentos").select("id, nome, textura, cor, sabor").execute()

        prompt = f"""
        Você é um nutricionista pediátrico especialista no método Food Chaining para crianças com hipersensibilidade sensorial e dificuldades alimentares.

        CONTEXTO CLÍNICO IMPORTANTE:
        - Crianças com hipersensibilidade têm todos os sentidos mais aguçados: visão, olfato, tato, paladar e audição ao mastigar.
        - O objetivo NÃO é substituir um alimento por outro. É introduzir o NOVO alimento AO LADO do alimento seguro, aos poucos.
        - A criança só explora quando se sente segura. O novo alimento deve parecer familiar e não ameaçador.
        - Especificidade é fundamental: não é "feijão" genérico — é feijão verde, feijão preto, lentilha. Cada um tem cor, textura e aparência diferente.
        - A forma de preparo é parte da aceitação: purê, assado em palitos, cozido amassado — isso muda completamente a experiência sensorial.

        DADOS DA CRIANÇA:
        - Alergias/Restrições ABSOLUTAS: {alergias_lista}
        - Alimentos que a criança JÁ COME (status "Comer") — ESTA É A BASE PRINCIPAL PARA SUAS SUGESTÕES: {alimentos_aceitos}
        - IDs a NÃO sugerir (já estão na trilha da criança, em qualquer etapa): {ids_na_trilha}
        - Catálogo do sistema (alimentos já cadastrados): {catalogo.data}

        REGRAS DE FOOD CHAINING:
        1. RESTRIÇÃO ABSOLUTA: Nunca sugira alimentos que contenham ou sejam derivados dos itens em "Alergias".
        2. SEMELHANÇA REAL: A conexão deve ser baseada em textura, cor e sabor dos alimentos que a criança JÁ ACEITA. Se algum atributo ainda estiver nulo, use seu conhecimento nutricional para inferir as propriedades a partir do nome do alimento (ex: Maçã → crocante, vermelha/verde, doce; Melancia → aquosa, vermelha, doce) e então faça a comparação. NUNCA ignore os alimentos aceitos por falta de atributos.
        3. FORMA DE PREPARO: Sugira a forma de preparo que mais aproxima o novo alimento do que a criança já aceita.
        4. INTRODUÇÃO GRADUAL: O novo alimento deve ser apresentado ao lado do alimento seguro, em pequenas quantidades, sem pressão.
        5. ESPECIFICIDADE: Seja específico. Não diga "feijão" — diga "feijão verde cozido" ou "feijão carioca amassado".
        6. MESMO GRUPO: Tente sugerir alimentos do mesmo grupo (fruta→fruta, raiz→raiz, etc.).
        7. NÃO REPITA: Não sugira alimentos cujos IDs estão na lista "IDs a NÃO sugerir".

        PROCESSO DE SELEÇÃO (SIGA ESTA ORDEM):
        - Passo 1: Analise os alimentos que a criança JÁ ACEITA (textura, cor, sabor).
        - Passo 2: Procure no catálogo do sistema um alimento similar que ela ainda não aceita.
          → Se encontrar: use-o, preencha "id" com o ID do catálogo e "novo" com false.
        - Passo 3: Se NÃO encontrar nenhum alimento adequado no catálogo: crie uma sugestão nova.
          → Preencha "id" como null e "novo" como true. Defina nome, textura, cor e sabor com precisão.

        Selecione 2 sugestões (priorizando o catálogo, mas criando novas quando necessário).

        Retorne SOMENTE um JSON válido, sem texto adicional:
        {{
          "sugestoes": [
            {{
              "id": "ID do alimento no catálogo, ou null se for novo",
              "novo": false,
              "nome": "nome específico do alimento",
              "motivo": "explicação clara para o pai: qual a semelhança real em textura, cor e sabor, e como apresentar ao lado do alimento seguro",
              "forma_preparo": "forma de preparo sugerida",
              "categoria": "Fruta | Legume | Verdura | Proteína | Carboidrato | Laticínio",
              "textura": "macio | crocante | cremoso | firme",
              "cor": "cor predominante do alimento",
              "sabor": "doce | salgado | amargo | azedo | neutro"
            }}
          ]
        }}
        """

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.4}
        }

        response = requests.post(GEMINI_URL, json=payload, headers=GEMINI_HEADERS)
        response.raise_for_status()

        dados = response.json()
        texto = dados['candidates'][0]['content']['parts'][0]['text']

        texto_limpo = texto.strip().replace("```json", "").replace("```", "").strip()
        resultado = json.loads(texto_limpo)

        for sugestao in resultado.get("sugestoes", []):
            if sugestao.get("novo") is True and not sugestao.get("id"):
                novo_alimento = {k: v for k, v in {
                    "nome": sugestao.get("nome"),
                    "textura": sugestao.get("textura"),
                    "cor": sugestao.get("cor"),
                    "sabor": sugestao.get("sabor"),
                }.items() if v is not None}

                inserido = supabase.table("alimentos").insert(novo_alimento).execute()
                if inserido.data:
                    sugestao["id"] = inserido.data[0]["id"]

        inseridos_nesta_chamada: set = set()
        for sugestao in resultado.get("sugestoes", []):
            aid = sugestao.get("id")
            if not aid:
                continue
            if aid in ids_na_trilha or aid in inseridos_nesta_chamada:
                continue

            supabase.table("crianca_alimento").insert({
                "crianca_id": crianca_id,
                "alimento_id": aid,
                "status": "Tolerar",
                "sugestao_ia": True,
                "justificativa_ia": sugestao.get("motivo"),
            }).execute()
            inseridos_nesta_chamada.add(aid)

        return resultado

    except Exception as e:
        print(f"Erro detalhado no Food Chaining: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar Food Chaining: {str(e)}")


# ---------------------------------------------------------------------------
# Analisador Clínico (Relatório para Terapeuta)
# ---------------------------------------------------------------------------
@router.post("/analise-relatorio/{crianca_id}")
async def gerar_analise_relatorio(crianca_id: str, force: bool = False):
    try:
        # Retorna do banco se já existe e não foi pedida regeneração
        if not force:
            crianca_resp = (
                supabase.table("criancas")
                .select("relatorio_ia")
                .eq("id", crianca_id)
                .maybe_single()
                .execute()
            )
            relatorio_salvo = crianca_resp.data.get("relatorio_ia") if crianca_resp.data else None
            if relatorio_salvo:
                return json.loads(relatorio_salvo)

        progresso_data = supabase.table("crianca_alimento") \
            .select("*, alimentos(nome, textura, cor, sabor)") \
            .eq("crianca_id", crianca_id) \
            .execute()

        historico_formatado = [
            {"alimento": i['alimentos']['nome'], "status": i['status'], "textura": i['alimentos']['textura']}
            for i in progresso_data.data if i.get('alimentos')
        ]

        prompt = f"""
        Você é um nutricionista pediátrico especialista em terapia alimentar pelo método Food Chaining e SOS Feeding.

        Analise o histórico abaixo de uma criança com hipersensibilidade sensorial em terapia alimentar:
        {historico_formatado}

        CONTEXTO:
        - Crianças com hipersensibilidade têm todos os sentidos mais aguçados.
        - A aceitação de novos alimentos é gradual e depende da sensação de segurança.
        - Padrões de textura, cor e sabor são determinantes na aceitação.

        Identifique:
        1. Padrões de aceitação por textura, cor ou categoria
        2. Pontos de estagnação ou regressão
        3. Evolução positiva que merece ser reforçada
        4. Recomendação prática para o próximo período terapêutico

        Retorne SOMENTE um JSON válido:
        {{
            "resumo_clinico": "resumo em 2-3 frases sobre o progresso geral, mencionando padrões sensoriais observados",
            "padroes_aceitacao": ["padrão observado 1", "padrão observado 2", "padrão observado 3"],
            "recomendacao": "recomendação prática e específica para o próximo período, incluindo sugestão de forma de preparo ou abordagem sensorial"
        }}
        """

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3}
        }

        response = requests.post(GEMINI_URL, json=payload, headers=GEMINI_HEADERS)
        response.raise_for_status()
        dados = response.json()
        texto = dados['candidates'][0]['content']['parts'][0]['text']
        texto_limpo = texto.strip().replace("```json", "").replace("```", "").strip()
        resultado = json.loads(texto_limpo)

        # Salva no banco para evitar regeneração desnecessária
        supabase.table("criancas").update(
            {"relatorio_ia": json.dumps(resultado, ensure_ascii=False)}
        ).eq("id", crianca_id).execute()

        return resultado

    except Exception as e:
        print(f"Erro detalhado no Relatório: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")
