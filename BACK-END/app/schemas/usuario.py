# app/schemas/usuario.py
# Modelos Pydantic que definem o "contrato" (formato esperado)
# das requisições e respostas relacionadas a usuários.

from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from uuid import UUID
from typing import Optional


# ---------------------------------------------------------------------------
# Schemas de REQUEST (dados que chegam do cliente → API)
# ---------------------------------------------------------------------------

class UsuarioCreate(BaseModel):
    """
    Payload para cadastrar um novo usuário.
    O user_id deve corresponder a um registro existente em 'auth.users'.
    """
    nome: str = Field(..., min_length=2, max_length=100, examples=["Maria Silva"])
    email: EmailStr = Field(
        ...,
        examples=["maria@email.com"],
        description="E-mail único do usuário",
    )
    user_id: Optional[UUID] = Field(
        default=None,
        examples=["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
        description="UUID do usuário autenticado em auth.users (opcional)",
    )


class UsuarioUpdate(BaseModel):
    """
    Payload para atualizar dados de um usuário (todos os campos são opcionais).
    Permite atualizações parciais (PATCH).
    """
    nome: Optional[str] = Field(default=None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None


# ---------------------------------------------------------------------------
# Schemas de RESPONSE (dados que a API devolve ao cliente)
# ---------------------------------------------------------------------------

class UsuarioResponse(BaseModel):
    """
    Representa um usuário tal como retornado pelo banco de dados.
    """
    id: UUID
    created_at: datetime
    nome: str
    email: str
    user_id: Optional[UUID] = None

    # Permite que o Pydantic leia diretamente de objetos ORM / dicts
    model_config = {"from_attributes": True}
