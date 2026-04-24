from fastapi import APIRouter, HTTPException
from app.database import supabase
import google.generativeai as genai
import os

router = APIRouter(prefix="/ia", tags=["Inteligência Artificial"])

# O modelo é instanciado uma vez para alta performance
model = genai.GenerativeModel('gemini-1.5-flash')

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
        Você é um nutricionista especialista em Food Chaining.
        - Alimentos que a criança JÁ ACEITA: {alimentos_aceitos}
        - Alimentos PROIBIDOS (Alergias): {alergias_lista}
        - Catálogo completo: {catalogo.data}
        
        Sua tarefa: Aplique o método Food Chaining. Sugira 2 alimentos do catálogo que a criança 
        ainda não come, mas que possuem textura, cor ou sabor similares aos que ela já aceita.
        
        Retorne estritamente um JSON:
        {{"sugestoes": [{{"id": "uuid", "nome": "nome", "motivo": "conexão sensorial"}}, ...]}}
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