# app/routers/alergias.py
# Endpoints para gerenciamento de alergias.
# Contém: listar, buscar por ID, cadastrar e atualizar.

from fastapi import APIRouter, HTTPException, status
from uuid import UUID
from typing import List 

from app.database import supabase
from app.schemas.alergia import AlergiaCreate, AlergiaUpdate, AlergiaResponse

# Prefixo e tag aplicados a todas as rotas deste módulo
router = APIRouter(prefix="/alergias", tags=["Alergias"])

# ---------------------------------------------------------------------------
# GET /alergias — Listar todas as alergias
# ---------------------------------------------------------------------------

@router.get(
    "/",
    response_model=List[AlergiaResponse],
    summary="Listar todas as alergias",
)
async def listar_alergias():
    """
    Retorna todas as alergias cadastradas no banco de dados.
    """
    try:
        resposta = supabase.table("alergias").select("*").execute()
        return resposta.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar alergias: {str(e)}",
        )
    
# ---------------------------------------------------------------------------
# GET /alergias/{alergia_id} — Buscar alergia por ID                    
# ---------------------------------------------------------------------------

@router.get(
    "/{alergia_id}",
    response_model=AlergiaResponse,
    summary="Buscar alergia por ID",
)
async def buscar_alergia(alergia_id: UUID):
    """
    Retorna os dados de uma alergia específica pelo seu UUID."""
    try:
        resposta = (
            supabase.table("alergias")
            .select("*")
            .eq("id", str(alergia_id))
            .maybe_single() #Retorna None se não encontrar (Evita exceção)
            .execute()
        )

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alergia não encontrada",
            )

        return resposta.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar alergia: {str(e)}",
        )
    
# ---------------------------------------------------------------------------
# POST /alergias — Cadastrar nova alergia
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=AlergiaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar nova alergia",
)
async def cadastrar_alergia(payload: AlergiaCreate):
    """
    Cadastra uma nova alergia no banco de dados.

    - **nome**: Nome da alergia (ex: "Glúten", "Lactose", "Amendoim").
    """
    try:
        # Converte o payload para dict e serializa tipos especiais (UUID, date)
        dados = payload.model_dump(mode="json")

        resposta = supabase.table("alergias").insert(dados).execute()

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Erro ao cadastrar alergia",
            )

        return resposta.data[0] # Retorna o registro criado (Supabase retorna lista)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao cadastrar alergia: {str(e)}",
        )
    
    
# ---------------------------------------------------------------------------
# PATCH /alergias/{alergia_id} — Atualizar alergia por ID
# ---------------------------------------------------------------------------

@router.patch(
    "/{alergia_id}",
    response_model=AlergiaResponse,
    summary="Atualizar dados de uma alergia",
)
async def atualizar_alergia(alergia_id: UUID, payload: AlergiaUpdate):
    """
    Atualiza os dados de uma alergia existente.
    """
    try:
        # Converte o payload para dict e remove campos None para não sobrescrever com NULL
        dados = payload.model_dump(mode="json", exclude_none=True)

        if not dados:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhum dado fornecido para atualização.",
            )

        resposta = (
            supabase.table("alergias")
            .update(dados)
            .eq("id", str(alergia_id))
            .execute()
        )

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alergia não encontrada",
            )
        
        return resposta.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar alergia: {str(e)}",
        )