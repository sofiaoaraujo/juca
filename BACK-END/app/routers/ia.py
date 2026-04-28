from fastapi import APIRouter, HTTPException
from app.database import supabase
import os
import json
import requests
from dotenv import load_dotenv

# 1. Carrega as variáveis do arquivo .env
load_dotenv()

router = APIRouter(prefix="/ia", tags=["Inteligência Artificial"])

# 2. Configura a URL direta usando um modelo ATUAL (gemini-2.5-flash) na rota v1beta
CHAVE_API = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={CHAVE_API}"

# ---------------------------------------------------------------------------
# Motor de Food Chaining (Sugestões para Home)
# ---------------------------------------------------------------------------
@router.post("/sugestao-food-chaining/{crianca_id}")
async def obter_sugestao(crianca_id: str):
    try:
        # Busca dados no Supabase
        alergias_data = supabase.table("crianca_alergia").select("alergias(nome)").eq("crianca_id", crianca_id).execute()
        alergias_lista = [item['alergias']['nome'] for item in alergias_data.data if item.get('alergias')]

        historico_sucesso = (
            supabase.table("crianca_alimento")
            .select("alimentos(id, nome, textura, cor, sabor)")
            .eq("crianca_id", crianca_id)
            .eq("status", "Aceita")
            .execute()
        )
        alimentos_aceitos = [h['alimentos'] for h in historico_sucesso.data if h.get('alimentos')]

        # Preenche campos sensoriais nulos com valores conhecidos para alimentos comuns
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
        ids_aceitos = [a['id'] for a in alimentos_aceitos]

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
        - Alimentos que a criança JÁ ACEITA — ESTA É A BASE PRINCIPAL PARA SUAS SUGESTÕES: {alimentos_aceitos}
        - IDs a NÃO sugerir (a criança já aceita esses): {ids_aceitos}
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
            "generationConfig": {
                "temperature": 0.4
            }
        }

        response = requests.post(GEMINI_URL, json=payload, headers={"Content-Type": "application/json"})
        response.raise_for_status()

        dados = response.json()
        texto = dados['candidates'][0]['content']['parts'][0]['text']

        texto_limpo = texto.strip().replace("```json", "").replace("```", "").strip()
        resultado = json.loads(texto_limpo)

        # Insere no banco qualquer alimento novo sugerido pela IA (não estava no catálogo)
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

        return resultado

    except Exception as e:
        print(f"Erro detalhado no Food Chaining: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar Food Chaining: {str(e)}")

# ---------------------------------------------------------------------------
# Analisador Clínico (Relatório para Terapeuta)
# ---------------------------------------------------------------------------
@router.post("/analise-relatorio/{crianca_id}")
async def gerar_analise_relatorio(crianca_id: str):
    try:
        progresso_data = supabase.table("crianca_alimento") \
            .select("*, alimentos(nome, textura, cor, sabor)") \
            .eq("crianca_id", crianca_id) \
            .execute()
        
        historico_formatado = [
            {"alimento": i['alimentos']['nome'], "status": i['status'], "textura": i['alimentos']['textura']} 
            for i in progresso_data.data if i.get('alimentos')
        ]

        prompt = f"""
        Analise o histórico de terapia alimentar (ABA): {historico_formatado}.
        Identifique padrões de evolução nas texturas.
        Retorne SOMENTE um JSON válido:
        {{
            "resumo_clinico": "resumo do progresso",
            "padroes_aceitacao": ["padrão 1", "padrão 2"],
            "recomendacao": "próximo passo"
        }}
        """

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3
            }
        }

        response = requests.post(GEMINI_URL, json=payload, headers={"Content-Type": "application/json"})
        response.raise_for_status()
        
        dados = response.json()
        texto = dados['candidates'][0]['content']['parts'][0]['text']
        
        texto_limpo = texto.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(texto_limpo)

    except Exception as e:
        print(f"Erro detalhado no Relatório: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")