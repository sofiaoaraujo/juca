# app/routers/alimentos.py
# Endpoints para gerenciamento do catálogo de alimentos.
# Contém: listar, buscar por ID, cadastrar e atualizar.

from fastapi import APIRouter, HTTPException, status
from uuid import UUID
from typing import List

from app.database import supabase
from app.schemas.alimento import AlimentoCreate, AlimentoUpdate, AlimentoResponse

router = APIRouter(prefix="/alimentos", tags=["Alimentos"])


# ---------------------------------------------------------------------------
# GET /alimentos — Listar todos os alimentos do catálogo
# ---------------------------------------------------------------------------
@router.get(
    "/",
    response_model=List[AlimentoResponse],
    summary="Listar todos os alimentos do catálogo",
)
async def listar_alimentos():
    """
    Retorna todos os alimentos cadastrados no catálogo.
    Suporta filtros futuros por textura, cor e sabor para personalização da trilha.
    """
    try:
        resposta = supabase.table("alimentos").select("*").order("nome").execute()
        return resposta.data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar alimentos: {str(e)}",
        )


# ---------------------------------------------------------------------------
# GET /alimentos/{alimento_id} — Buscar alimento por ID
# ---------------------------------------------------------------------------
@router.get(
    "/{alimento_id}",
    response_model=AlimentoResponse,
    summary="Buscar alimento por ID",
)
async def buscar_alimento(alimento_id: UUID):
    """
    Retorna os detalhes de um alimento específico pelo seu UUID.
    """
    try:
        resposta = (
            supabase.table("alimentos")
            .select("*")
            .eq("id", str(alimento_id))
            .maybe_single()
            .execute()
        )

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alimento com ID '{alimento_id}' não encontrado.",
            )

        return resposta.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar alimento: {str(e)}",
        )


# ---------------------------------------------------------------------------
# POST /alimentos — Cadastrar novo alimento no catálogo
# ---------------------------------------------------------------------------
@router.post(
    "/",
    response_model=AlimentoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar novo alimento no catálogo",
)
async def cadastrar_alimento(payload: AlimentoCreate):
    """
    Adiciona um novo alimento ao catálogo global do JUCA.

    - **nome**: Nome do alimento (ex: Banana, Maçã).
    - **textura**: Característica tátil (ex: Macia, Crocante).
    - **cor**: Cor predominante (ex: Amarela, Vermelha).
    - **sabor**: Perfil de sabor (ex: Doce, Azedo, Salgado).
    """
    try:
        dados = payload.model_dump(mode="json", exclude_none=True)

        resposta = supabase.table("alimentos").insert(dados).execute()

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não foi possível cadastrar o alimento.",
            )

        return resposta.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao cadastrar alimento: {str(e)}",
        )


# ---------------------------------------------------------------------------
# PATCH /alimentos/{alimento_id} — Atualizar alimento
# ---------------------------------------------------------------------------
@router.patch(
    "/{alimento_id}",
    response_model=AlimentoResponse,
    summary="Atualizar dados de um alimento",
)
async def atualizar_alimento(alimento_id: UUID, payload: AlimentoUpdate):
    """
    Atualiza parcialmente os dados de um alimento do catálogo.
    """
    try:
        dados = payload.model_dump(mode="json", exclude_none=True)

        if not dados:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhum dado fornecido para atualização.",
            )

        resposta = (
            supabase.table("alimentos")
            .update(dados)
            .eq("id", str(alimento_id))
            .execute()
        )

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alimento com ID '{alimento_id}' não encontrado.",
            )

        return resposta.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar alimento: {str(e)}",
        )
