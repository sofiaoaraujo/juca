# app/routers/neurodivergencias.py
from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.neurodivergencia import NeurodivergenciaResponse, NeurodivergenciaCreate
from app.config import settings
from supabase import create_client, Client

router = APIRouter(prefix="/neurodivergencias", tags=["Neurodivergências"])
supabase: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

#Retorna todas as neurodivergências cadastradas no banco (ex: TEA, TDAH).
@router.get("/", response_model=List[NeurodivergenciaResponse])
async def listar_neurodivergencias():
    try:
        """Retorna todas as neurodivergências cadastradas no banco (ex: TEA, TDAH)."""
        response = supabase.table("neurodivergencias").select("*").execute()
        return response.data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar neurodivergências: {str(e)}")

#Retorna uma neurodivergência específica pelo ID (ex: TEA, TDAH). Útil para detalhes ou edição.
@router.get("/{neuro_id}", response_model=NeurodivergenciaResponse)
async def obter_neurodivergencia(neuro_id: str):
    try:
        response = supabase.table("neurodivergencias").select("*").eq("id", neuro_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Neurodivergência não encontrada")
        return response.data[0] 
    
    except HTTPException:
        raise  # re-lança o 404 sem encapsular

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter neurodivergência: {str(e)}")

#Cadastra uma nova neurodivergência no banco. Útil para expandir o catálogo de condições disponíveis.
@router.post("/", response_model=NeurodivergenciaResponse)
async def criar_neurodivergencia(neuro: NeurodivergenciaCreate):
    try:   
        """Cadastra uma nova neurodivergência no banco."""
        response = supabase.table("neurodivergencias").insert(neuro.model_dump()).execute()

        return response.data[0]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar neurodivergência: {str(e)}")
