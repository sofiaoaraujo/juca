# app/routers/criancas.py
# Endpoints para gerenciamento de crianças.
# Contém: listar, buscar por ID, cadastrar e atualizar.

from fastapi import APIRouter, HTTPException, status
from uuid import UUID
from typing import List

from app.database import supabase
from app.schemas.crianca import CriancaCreate, CriancaUpdate, CriancaResponse

# Prefixo e tag aplicados a todas as rotas deste módulo
router = APIRouter(prefix="/criancas", tags=["Crianças"])


# ---------------------------------------------------------------------------
# GET /criancas — Listar todas as crianças
# ---------------------------------------------------------------------------
@router.get(
    "/",
    response_model=List[CriancaResponse],
    summary="Listar todas as crianças",
)
async def listar_criancas():
    """
    Retorna todas as crianças cadastradas no banco de dados.
    Em produção, filtre pelo cuidador autenticado usando RLS ou
    adicionando `.eq("cuidador_id", user_id)` na query.
    """
    try:
        resposta = supabase.table("criancas").select("*").execute()
        return resposta.data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar crianças: {str(e)}",
        )


# ---------------------------------------------------------------------------
# GET /criancas/cuidador/{cuidador_id} — Listar crianças de um cuidador
# ---------------------------------------------------------------------------
@router.get(
    "/cuidador/{cuidador_id}",
    response_model=List[CriancaResponse],
    summary="Listar crianças de um cuidador",
)
async def listar_criancas_por_cuidador(cuidador_id: UUID):
    try:
        resposta = (
            supabase.table("criancas")
            .select("*")
            .eq("cuidador_id", str(cuidador_id))
            .execute()
        )
        return resposta.data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar crianças do cuidador: {str(e)}",
        )

# ---------------------------------------------------------------------------
# GET /criancas/{crianca_id} — Buscar criança por ID
# ---------------------------------------------------------------------------
@router.get(
    "/{crianca_id}",
    response_model=CriancaResponse,
    summary="Buscar criança por ID",
)
async def buscar_crianca(crianca_id: UUID):
    """
    Retorna os dados de uma criança específica pelo seu UUID.
    Retorna 404 caso a criança não seja encontrada.
    """
    try:
        resposta = (
            supabase.table("criancas")
            .select("*")
            .eq("id", str(crianca_id))
            .maybe_single()  # Retorna None se não encontrar (evita exceção)
            .execute()
        )

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Criança com ID '{crianca_id}' não encontrada.",
            )

        return resposta.data

    except HTTPException:
        raise  # Re-lança HTTPExceptions sem encapsular, serve para 404 e outros erros específicos
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar criança: {str(e)}",
        )


# ---------------------------------------------------------------------------
# POST /criancas — Cadastrar nova criança
# ---------------------------------------------------------------------------
@router.post(
    "/",
    response_model=CriancaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar uma nova criança",
)
async def cadastrar_crianca(payload: CriancaCreate):
    """
    Cadastra uma nova criança vinculada a um cuidador existente.

    - **nome**: Nome completo da criança (obrigatório).
    - **data_nascimento**: Data no formato YYYY-MM-DD (opcional).
    - **cuidador_id**: UUID do usuário responsável (obrigatório).
    """
    try:
        # Converte o payload para dict e serializa tipos especiais (UUID, date)
        dados = payload.model_dump(mode="json")

        resposta = supabase.table("criancas").insert(dados).execute()

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não foi possível cadastrar a criança. Verifique o cuidador_id.",
            )

        return resposta.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao cadastrar criança: {str(e)}",
        )


# ---------------------------------------------------------------------------
# PATCH /criancas/{crianca_id} — Atualizar dados de uma criança
# ---------------------------------------------------------------------------
@router.patch(
    "/{crianca_id}",
    response_model=CriancaResponse,
    summary="Atualizar dados de uma criança",
)
async def atualizar_crianca(crianca_id: UUID, payload: CriancaUpdate):
    """
    Atualiza parcialmente os dados de uma criança.
    Apenas os campos enviados serão modificados.
    """
    try:
        # Remove campos None para não sobrescrever dados existentes com null
        dados = payload.model_dump(mode="json", exclude_none=True)

        if not dados:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhum dado fornecido para atualização.",
            )

        resposta = (
            supabase.table("criancas")
            .update(dados)
            .eq("id", str(crianca_id))
            .execute()
        )

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Criança com ID '{crianca_id}' não encontrada.",
            )

        return resposta.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar criança: {str(e)}",
        )

#----------------------------------------------------------------------------
# DELETE /criancas/{crianca_id} — Excluir uma criança
#----------------------------------------------------------------------------

@router.delete(
    "/{crianca_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover uma criança",
)
async def remover_crianca(crianca_id: UUID):
    try:
        resposta = (
            supabase.table("criancas")
            .delete()
            .eq("id", str(crianca_id))
            .execute()
        )
        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Criança com ID '{crianca_id}' não encontrada.",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao remover criança: {str(e)}",
        )