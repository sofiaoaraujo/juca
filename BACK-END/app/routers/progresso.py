# app/routers/progresso.py
# Endpoints para gerenciar o progresso de crianças na Trilha ABA.
# Esta é a "espinha dorsal" do JUCA — registra cada etapa da jornada alimentar.
#
# Etapas da Trilha ABA (inspirada no Duolingo):
#   Tocar → Cheirar → Lamber → Comer → Aceita
#   (A qualquer momento pode ser registrado como 'Recusado')

from fastapi import APIRouter, HTTPException, status
from uuid import UUID
from typing import List

from app.database import supabase
from app.schemas.progresso import (
    ProgressoCreate,
    ProgressoUpdate,
    ProgressoResponse,
    ProgressoComAlimentoResponse,
)

router = APIRouter(prefix="/progresso", tags=["Progresso (Trilha ABA)"])


# ---------------------------------------------------------------------------
# POST /progresso — Registrar progresso de uma criança com um alimento
# ---------------------------------------------------------------------------
@router.post(
    "/",
    response_model=ProgressoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar progresso de uma criança com um alimento",
)
async def registrar_progresso(payload: ProgressoCreate):
    """
    Cria um novo registro de progresso na Trilha ABA.

    Use este endpoint para iniciar a jornada de uma criança com um alimento
    ou para registrar uma nova etapa concluída.

    **Etapas válidas:** Tocar | Cheirar | Lamber | Comer | Aceita | Recusado
    """
    try:
        # Verifica se a criança existe antes de inserir
        crianca = (
            supabase.table("criancas")
            .select("id")
            .eq("id", str(payload.crianca_id))
            .maybe_single()
            .execute()
        )
        if not crianca.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Criança com ID '{payload.crianca_id}' não encontrada.",
            )

        # Verifica se o alimento existe
        alimento = (
            supabase.table("alimentos")
            .select("id")
            .eq("id", str(payload.alimento_id))
            .maybe_single()
            .execute()
        )
        if not alimento.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alimento com ID '{payload.alimento_id}' não encontrado.",
            )

        dados = payload.model_dump(mode="json")
        resposta = supabase.table("crianca_alimento").insert(dados).execute()

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não foi possível registrar o progresso.",
            )

        return resposta.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao registrar progresso: {str(e)}",
        )


# ---------------------------------------------------------------------------
# GET /progresso/crianca/{crianca_id} — Buscar trilha completa de uma criança
# ---------------------------------------------------------------------------
@router.get(
    "/crianca/{crianca_id}",
    response_model=List[ProgressoComAlimentoResponse],
    summary="Buscar todos os alimentos e status de uma criança",
)
async def buscar_trilha_da_crianca(crianca_id: UUID):
    """
    Retorna a Trilha ABA completa de uma criança:
    todos os alimentos que ela já interagiu e o status atual de cada um.

    O join com a tabela 'alimentos' é feito via sintaxe de seleção do Supabase,
    retornando os dados do alimento embutidos no objeto de progresso.
    """
    try:
        # Supabase permite joins declarativos na string de select.
        # 'alimentos(*)' faz um LEFT JOIN automático via FK.
        resposta = (
            supabase.table("crianca_alimento")
            .select("*, alimentos(*)")
            .eq("crianca_id", str(crianca_id))
            .order("created_at", desc=False)  # Ordena por data de inserção (cronológico)
            .execute()
        )

        # Remapeia o campo 'alimentos' (nome da tabela) para 'alimento' (nome do schema)
        resultados = []
        for item in resposta.data:
            item_mapeado = {
                "id": item["id"],
                "created_at": item["created_at"],
                "crianca_id": item["crianca_id"],
                "status": item["status"],
                "alimento": item.get("alimentos"),  # Supabase retorna o nome da tabela
            }
            resultados.append(item_mapeado)

        return resultados

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar trilha da criança: {str(e)}",
        )


# ---------------------------------------------------------------------------
# PATCH /progresso/{progresso_id} — Atualizar etapa do progresso
# ---------------------------------------------------------------------------
@router.patch(
    "/{progresso_id}",
    response_model=ProgressoResponse,
    summary="Atualizar etapa do progresso de uma criança",
)
async def atualizar_progresso(progresso_id: UUID, payload: ProgressoUpdate):
    """
    Avança (ou retrocede) a etapa de uma criança na Trilha ABA para um alimento.

    Exemplo de uso: criança evolui de 'Tocar' para 'Cheirar'.
    """
    try:
        dados = payload.model_dump(mode="json")

        resposta = (
            supabase.table("crianca_alimento")
            .update(dados)
            .eq("id", str(progresso_id))
            .execute()
        )

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Registro de progresso com ID '{progresso_id}' não encontrado.",
            )

        return resposta.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar progresso: {str(e)}",
        )


# ---------------------------------------------------------------------------
# GET /progresso/crianca/{crianca_id}/alimento/{alimento_id}
# Buscar progresso específico de uma criança com um alimento
# ---------------------------------------------------------------------------
@router.get(
    "/crianca/{crianca_id}/alimento/{alimento_id}",
    response_model=ProgressoResponse,
    summary="Buscar progresso de uma criança com um alimento específico",
)
async def buscar_progresso_especifico(crianca_id: UUID, alimento_id: UUID):
    """
    Retorna o registro de progresso de uma criança com um alimento específico.
    Útil para verificar em qual etapa a criança está antes de registrar nova interação.
    """
    try:
        resposta = (
            supabase.table("crianca_alimento")
            .select("*")
            .eq("crianca_id", str(crianca_id))
            .eq("alimento_id", str(alimento_id))
            .order("created_at", desc=True)  # Pega o mais recente
            .limit(1)
            .execute()
        )

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Nenhum progresso encontrado para a criança '{crianca_id}' "
                    f"com o alimento '{alimento_id}'."
                ),
            )

        return resposta.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar progresso: {str(e)}",
        )
