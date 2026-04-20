# app/schemas/crianca.py
# Modelos Pydantic que definem o "contrato" (formato esperado)
# das requisições e respostas relacionadas a crianças.

from pydantic import BaseModel, Field
from datetime import date, datetime
from uuid import UUID
from typing import Optional


# ---------------------------------------------------------------------------
# Schemas de REQUEST (dados que chegam do cliente → API)
# ---------------------------------------------------------------------------

class CriancaCreate(BaseModel):
    """
    Payload para cadastrar uma nova criança.
    O cuidador_id deve corresponder a um registro existente em 'usuarios'.
    """
    nome: str = Field(..., min_length=2, max_length=100, examples=["Ana Luiza"])
    data_nascimento: Optional[date] = Field(
        default=None,
        examples=["2019-05-15"],
        description="Data de nascimento no formato YYYY-MM-DD",
    )
    cuidador_id: UUID = Field(
        ...,
        examples=["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
        description="UUID do usuário (cuidador) responsável pela criança",
    )


class CriancaUpdate(BaseModel):
    """
    Payload para atualizar dados de uma criança (todos os campos são opcionais).
    Permite atualizações parciais (PATCH).
    """
    nome: Optional[str] = Field(default=None, min_length=2, max_length=100)
    data_nascimento: Optional[date] = None


# ---------------------------------------------------------------------------
# Schemas de RESPONSE (dados que a API devolve ao cliente)
# ---------------------------------------------------------------------------

class CriancaResponse(BaseModel):
    """
    Representa uma criança tal como retornada pelo banco de dados.
    """
    id: UUID
    created_at: datetime
    nome: str
    data_nascimento: Optional[date] = None
    cuidador_id: UUID

    # Permite que o Pydantic leia diretamente de objetos ORM / dicts
    model_config = {"from_attributes": True}
