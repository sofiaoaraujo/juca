# app/routers/neurodivergencias.py
from fastapi import APIRouter
from typing import List
from app.schemas.neurodivergencia import NeurodivergenciaResponse, NeurodivergenciaCreate
from app.config import settings
from supabase import create_client, Client

router = APIRouter(prefix="/neurodivergencias", tags=["Neurodivergências"])
supabase: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

@router.get("/", response_model=List[NeurodivergenciaResponse])
def listar_neurodivergencias():
    """Retorna todas as neurodivergências cadastradas no banco (ex: TEA, TDAH)."""
    response = supabase.table("neurodivergencias").select("*").execute()
    return response.data

@router.post("/", response_model=NeurodivergenciaResponse)
def criar_neurodivergencia(neuro: NeurodivergenciaCreate):
    """Cadastra uma nova neurodivergência no banco."""
    response = supabase.table("neurodivergencias").insert(neuro.model_dump()).execute()
    return response.data[0]