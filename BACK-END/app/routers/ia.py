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

        catalogo = supabase.table("alimentos").select("id, nome, textura, cor, sabor").execute()

        prompt = f"""
        Você é um nutricionista pediátrico especialista no método Food Chaining (Cheri Fraker).
        Sua missão é sugerir o próximo passo na dieta da criança, mantendo a estabilidade sensorial e a segurança absoluta.

        DADOS DA CRIANÇA:
        - Alimentos que a criança JÁ ACEITA (Base): {alimentos_aceitos}
        - Alimentos PROIBIDOS (Alergias e Restrições): {alergias_lista}
        - Catálogo completo de opções: {catalogo.data}

        REGRAS DE SEGURANÇA E LÓGICA:
        1. RESTRIÇÃO ABSOLUTA: É terminantemente proibido sugerir qualquer alimento que contenha os itens listados em "Alimentos PROIBIDOS".
        2. MANTENHA A CATEGORIA: NÃO mude a categoria abruptamente.
        3. MUDANÇA GRADUAL: A alteração de um atributo (textura, cor ou sabor) deve ser mínima.
        4. EFEITO DE PONTE: A sugestão deve ser uma extensão lógica do que ela já aceita.
        5. VINCULAÇÃO SENSORIAL: Priorize alimentos com características muito próximas às que a criança já consome.

        Selecione 2 alimentos do catálogo que NÃO violam alergias e formam o elo mais seguro com a base atual da criança.

        Retorne SOMENTE um JSON válido:
        {{
          "sugestoes": [
            {{
              "id": "ID do alimento no catálogo",
              "nome": "nome do alimento",
              "motivo": "conexão sensorial com o que ela já come",
              "categoria": "Fruta | Legume | Verdura | Proteína | Carboidrato | Laticínio",
              "textura": "macio | crocante | cremoso | firme",
              "cor": "cor predominante"
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
        return json.loads(texto_limpo)

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