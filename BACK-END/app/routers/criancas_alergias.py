# app/routers/crianca_alergia.py
# Endpoints para gerenciar as alergias de uma criança.

from fastapi import APIRouter, HTTPException, status
from uuid import UUID
from typing import List

from app.database import supabase
from app.schemas.crianca_alergia import CriancaAlergiaCreate,CriancaAlergiaResponse,CriancaAlergiaComDetalhesResponse


router = APIRouter(prefix="/crianca-alergia", tags=["Criança x Alergia"])

# ---------------------------------------------------------------------------
# GET /crianca-alergia/crianca/{crianca_id} — Listar alergias de uma criança
# ---------------------------------------------------------------------------
@router.get(
    "/crianca/{crianca_id}",
    response_model=List[CriancaAlergiaComDetalhesResponse],
    summary="Listar todas as alergias de uma criança",
)
async def listar_alergias_da_crianca(crianca_id: UUID):
    """
    Retorna todas as alergias vinculadas a uma criança, com os dados da alergia embutidos.
    """
    try:
        resposta = (
            supabase.table("crianca_alergia")
            .select("*, alergias(*)")
            .eq("crianca_id", str(crianca_id))
            .execute()
        )

        resultados = []
        for item in resposta.data:
            resultados.append({
                "id": item["id"],
                "created_at": item["created_at"],
                "crianca_id": item["crianca_id"],
                "alergia": item.get("alergias"),
            })

        return resultados

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar alergias da criança: {str(e)}",
        )


# ---------------------------------------------------------------------------
# POST /crianca-alergia — Vincular alergia a uma criança
# ---------------------------------------------------------------------------
@router.post(
    "/",
    response_model=CriancaAlergiaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Vincular uma alergia a uma criança",
)
async def vincular_alergia(payload: CriancaAlergiaCreate):
    """
    Registra que uma criança possui uma alergia específica.

    - **crianca_id**: UUID da criança.
    - **alergia_id**: UUID da alergia.
    """
    try:
        crianca = (
            supabase.table("criancas")
            .select("id")
            .eq("id", str(payload.crianca_id))
            .maybe_single()
            .execute()
        )
        if not crianca or not crianca.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Criança com ID '{payload.crianca_id}' não encontrada.",
            )

        alergia = (
            supabase.table("alergias")
            .select("id")
            .eq("id", str(payload.alergia_id))
            .maybe_single()
            .execute()
        )
        if not alergia or not alergia.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alergia com ID '{payload.alergia_id}' não encontrada.",
            )

        dados = payload.model_dump(mode="json")
        resposta = supabase.table("crianca_alergia").insert(dados).execute()

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não foi possível vincular a alergia à criança.",
            )

        return resposta.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao vincular alergia: {str(e)}",
        )


# ---------------------------------------------------------------------------
# DELETE /crianca-alergia/{id} — Remover vínculo de alergia
# ---------------------------------------------------------------------------
@router.delete(
    "/{crianca_alergia_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover vínculo de alergia de uma criança",
)
async def remover_alergia(crianca_alergia_id: UUID):
    """
    Remove o vínculo entre uma criança e uma alergia.
    """
    try:
        resposta = (
            supabase.table("crianca_alergia")
            .delete()
            .eq("id", str(crianca_alergia_id))
            .execute()
        )

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vínculo com ID '{crianca_alergia_id}' não encontrado.",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao remover alergia: {str(e)}",
        )
