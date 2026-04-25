from fastapi import APIRouter, HTTPException
from app.database import supabase
import google.generativeai as genai
import os

router = APIRouter(prefix="/ia", tags=["Inteligência Artificial"])

# O modelo é instanciado uma vez para alta performance
model = genai.GenerativeModel('gemini-2.0-flash')

# ---------------------------------------------------------------------------
# Motor de Food Chaining (Sugestões para Home)
# ---------------------------------------------------------------------------
@router.post("/sugestao-food-chaining/{crianca_id}")
async def obter_sugestao(crianca_id: str):
    try:
        # 1. Busca alergias (proibidos)
        alergias_data = supabase.table("crianca_alergia").select("alergias(nome)").eq("crianca_id", crianca_id).execute()
        alergias_lista = [item['alergias']['nome'] for item in alergias_data.data if item.get('alergias')]

        # 2. Busca alimentos que a criança JÁ ACEITA (status 'Aceita')
        # Usamos o progresso.py como base de dados real
        historico_sucesso = (
            supabase.table("crianca_alimento")
            .select("alimentos(id, nome, textura, cor, sabor)")
            .eq("crianca_id", crianca_id)
            .eq("status", "Aceita")
            .execute()
        )
        alimentos_aceitos = [h['alimentos'] for h in historico_sucesso.data if h.get('alimentos')]

        # 3. Busca Catálogo Completo
        catalogo = supabase.table("alimentos").select("id, nome, textura, cor, sabor").execute()

        # 4. Prompt de Food Chaining (lógica sensorial)
        prompt = f"""
        Você é um nutricionista pediátrico especialista no método Food Chaining (Cheri Fraker).
        Sua missão é sugerir o próximo passo na dieta da criança, mantendo a estabilidade sensorial e a segurança absoluta.

        DADOS DA CRIANÇA:
        - Alimentos que a criança JÁ ACEITA (Base): {alimentos_aceitos}
        - Alimentos PROIBIDOS (Alergias e Restrições): {alergias_lista}
        - Catálogo completo de opções: {catalogo.data}

        REGRAS DE SEGURANÇA E LÓGICA:
        1. RESTRIÇÃO ABSOLUTA: É terminantemente proibido sugerir qualquer alimento que contenha, em sua composição ou categoria, os itens listados em "Alimentos PROIBIDOS". Se o catálogo contiver um alimento que possa desencadear alergia, descarte-o imediatamente do processo de escolha.
        2. MANTENHA A CATEGORIA: Se a criança come maçã (fruta crocante), busque outra fruta crocante. NÃO mude a categoria (ex: fruta para vegetal) abruptamente.
        3. MUDANÇA GRADUAL: A alteração de um atributo (textura, cor ou sabor) deve ser mínima.
        4. EFEITO DE PONTE: A sugestão deve ser uma extensão lógica do que ela já aceita.
        5. VINCULAÇÃO SENSORIAL: Priorize alimentos com características (textura, sabor e cor) muito próximas às que a criança já consome.

        Sua tarefa: Selecione 2 alimentos do catálogo que NÃO estão no histórico de aceitação, que NÃO violam as restrições de alergia e que formam o elo mais seguro com a base atual da criança.

        Retorne estritamente um JSON:
        {{
            "sugestoes": [
                {{"id": "uuid", "nome": "nome", "motivo": "Explicação: Por que este alimento é seguro e como ele se conecta sensorialmente com o que ela já come."}},
                {{"id": "uuid", "nome": "nome", "motivo": "Explicação técnica da conexão sensorial e passo da corrente."}}
            ]
        }}
        """

        response = model.generate_content(
            prompt, 
            generation_config={"response_mime_type": "application/json"}
        )
        
        return response.text

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar Food Chaining: {str(e)}")

# ---------------------------------------------------------------------------
# Analisador Clínico (Relatório para Terapeuta)
# ---------------------------------------------------------------------------
@router.post("/analise-relatorio/{crianca_id}")
async def gerar_analise_relatorio(crianca_id: str):
    try:
        # Busca todo o progresso (Trilha ABA)
        progresso_data = supabase.table("crianca_alimento") \
            .select("*, alimentos(nome, textura, cor, sabor)") \
            .eq("crianca_id", crianca_id) \
            .execute()
        
        historico_formatado = [
            {"alimento": i['alimentos']['nome'], "status": i['status'], "textura": i['alimentos']['textura']} 
            for i in progresso_data.data if i.get('alimentos')
        ]

        prompt = f"""
        Analise o histórico abaixo de um paciente em terapia alimentar (ABA): {historico_formatado}.
        Identifique padrões de estagnação ou evolução nas texturas.
        Retorne JSON: {{"resumo_clinico": "...", "padroes_aceitacao": [], "recomendacao": "..."}}
        """

        response = model.generate_content(
            prompt, 
            generation_config={"response_mime_type": "application/json"}
        )
        
        return response.text

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")