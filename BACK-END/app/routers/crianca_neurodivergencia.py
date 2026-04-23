# app/routers/criancas_neurodivergencias.py
from fastapi import APIRouter
from typing import List
from app.schemas.crianca_neurodivergencia import CriancaNeurodivergenciaResponse, CriancaNeurodivergenciaCreate
from app.config import settings
from supabase import create_client, Client

router = APIRouter(prefix="/criancas-neurodivergencias", tags=["Criança x Neurodivergência"])
supabase: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

@router.post("/", response_model=CriancaNeurodivergenciaResponse)
def vincular_neurodivergencia(vinculo: CriancaNeurodivergenciaCreate):
    """Vincula uma criança a uma neurodivergência específica."""
    response = supabase.table("crianca_neurodivergencia").insert(vinculo.model_dump(mode='json')).execute()
    return response.data[0]

@router.get("/{crianca_id}", response_model=List[CriancaNeurodivergenciaResponse])
def listar_neurodivergencias_da_crianca(crianca_id: str):
    """Busca todas as neurodivergências ligadas a uma criança específica."""
    response = supabase.table("crianca_neurodivergencia").select("*").eq("crianca_id", crianca_id).execute()
    return response.data