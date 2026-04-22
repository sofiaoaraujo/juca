# app/schemas/alimento.py
# Modelos Pydantic para requisições e respostas de alimentos.

from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional


# ---------------------------------------------------------------------------
# Schemas de REQUEST
# ---------------------------------------------------------------------------

class AlimentoCreate(BaseModel):
    """
    Payload para cadastrar um novo alimento no catálogo.
    """
    nome: str = Field(..., min_length=2, max_length=100, examples=["Banana"])
    textura: Optional[str] = Field(
        default=None, examples=["Macia"], description="Ex: Crocante, Macia, Cremosa"
    )
    cor: Optional[str] = Field(
        default=None, examples=["Amarela"], description="Cor predominante do alimento"
    )
    sabor: Optional[str] = Field(
        default=None, examples=["Doce"], description="Ex: Doce, Salgado, Amargo, Azedo"
    )


class AlimentoUpdate(BaseModel):
    """
    Payload para atualização parcial de um alimento.
    """
    nome: Optional[str] = Field(default=None, min_length=2, max_length=100)
    textura: Optional[str] = None
    cor: Optional[str] = None
    sabor: Optional[str] = None


# ---------------------------------------------------------------------------
# Schemas de RESPONSE
# ---------------------------------------------------------------------------

class AlimentoResponse(BaseModel):
    """
    Representa um alimento como retornado pelo banco de dados.
    """
    id: UUID
    created_at: datetime
    nome: str
    textura: Optional[str] = None
    cor: Optional[str] = None
    sabor: Optional[str] = None

    model_config = {"from_attributes": True}
