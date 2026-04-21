# app/routers/usuarios.py
# Endpoints para gerenciamento de usuários.
# Contém: listar, buscar por ID, cadastrar e atualizar.

from fastapi import APIRouter, HTTPException, status
from uuid import UUID
from typing import List

from app.database import supabase
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse

# Prefixo e tag aplicados a todas as rotas deste módulo
router = APIRouter(prefix="/usuarios", tags=["Usuários"])


# ---------------------------------------------------------------------------
# GET /usuarios — Listar todos os usuários
# ---------------------------------------------------------------------------
@router.get(
    "/",
    response_model=List[UsuarioResponse],
    summary="Listar todos os usuários",
)
async def listar_usuarios():
    """
    Retorna todos os usuários cadastrados no banco de dados.
    """
    try:
        resposta = supabase.table("usuarios").select("*").execute()
        return resposta.data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar usuários: {str(e)}",
        )


# ---------------------------------------------------------------------------
# GET /usuarios/{usuario_id} — Buscar usuário por ID
# ---------------------------------------------------------------------------
@router.get(
    "/{usuario_id}",
    response_model=UsuarioResponse,
    summary="Buscar usuário por ID",
)
async def buscar_usuario(usuario_id: UUID):
    """
    Retorna os dados de um usuário específico pelo seu UUID.
    Retorna 404 caso o usuário não seja encontrado.
    """
    try:
        resposta = (
            supabase.table("usuarios")
            .select("*")
            .eq("id", str(usuario_id))
            .maybe_single()  # Retorna None se não encontrar (evita exceção)
            .execute()
        )

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário com ID '{usuario_id}' não encontrado.",
            )

        return resposta.data

    except HTTPException:
        raise  # Re-lança HTTPExceptions sem encapsular
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar usuário: {str(e)}",
        )


# ---------------------------------------------------------------------------
# POST /usuarios — Cadastrar novo usuário
# ---------------------------------------------------------------------------
@router.post(
    "/",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar um novo usuário",
)
async def cadastrar_usuario(payload: UsuarioCreate):
    """
    Cadastra um novo usuário na aplicação.

    - **nome**: Nome completo do usuário (obrigatório).
    - **email**: E-mail único do usuário (obrigatório).
    - **user_id**: UUID do registro em auth.users (opcional).
    """
    try:
        # Remove campos None para não violar FK com user_id ausente
        dados = payload.model_dump(mode="json", exclude_none=True)

        resposta = supabase.table("usuarios").insert(dados).execute()

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não foi possível cadastrar o usuário. Verifique os dados enviados.",
            )

        return resposta.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao cadastrar usuário: {str(e)}",
        )


# ---------------------------------------------------------------------------
# PATCH /usuarios/{usuario_id} — Atualizar dados de um usuário
# ---------------------------------------------------------------------------
@router.patch(
    "/{usuario_id}",
    response_model=UsuarioResponse,
    summary="Atualizar dados de um usuário",
)
async def atualizar_usuario(usuario_id: UUID, payload: UsuarioUpdate):
    """
    Atualiza parcialmente os dados de um usuário.
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
            supabase.table("usuarios")
            .update(dados)
            .eq("id", str(usuario_id))
            .execute()
        )

        if not resposta.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário com ID '{usuario_id}' não encontrado.",
            )

        return resposta.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar usuário: {str(e)}",
        )
