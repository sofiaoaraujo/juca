# app/schemas/progresso.py
# Modelos Pydantic para o progresso de uma criança com um alimento.
# Reflete a tabela 'crianca_alimento' e incorpora a lógica da Trilha SOS.

from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from uuid import UUID
from typing import Optional
from app.schemas.alimento import AlimentoResponse


# ---------------------------------------------------------------------------
# Constantes da Trilha SOS Approach to Feeding (Dr. Kay Toomey)
# ---------------------------------------------------------------------------

# Etapas hierárquicas SOS Approach to Feeding (Dr. Kay Toomey)
# Tolerar → Interagir → Cheirar → Tocar → Saborear → Comer
# 'Recusado' é transversal: pode ocorrer em qualquer nível.
STATUS_PERMITIDOS = {
    "Tolerar", "Interagir", "Cheirar",
    "Tocar", "Saborear", "Comer",
    "Recusado",
}


# ---------------------------------------------------------------------------
# Schemas de REQUEST
# ---------------------------------------------------------------------------

class ProgressoCreate(BaseModel):
    """
    Payload para registrar ou iniciar o progresso de uma criança com um alimento.
    O status deve seguir as etapas da Trilha SOS.
    """
    crianca_id: UUID = Field(
        ..., examples=["3fa85f64-5717-4562-b3fc-2c963f66afa6"]
    )
    alimento_id: UUID = Field(
        ..., examples=["7c9e6679-7425-40de-944b-e07fc1f90ae7"]
    )
    status: str = Field(
        ...,
        examples=["Tolerar"],
        description=f"Etapa atual na Trilha SOS. Valores permitidos: {STATUS_PERMITIDOS}",
    )
    sugestao_ia: Optional[bool] = Field(
        default=None,
        description="Indica se este alimento foi sugerido pelo motor de Food Chaining da IA.",
    )
    justificativa_ia: Optional[str] = Field(
        default=None,
        description="Motivo da sugestão gerado pela IA (Food Chaining).",
    )

    @field_validator("status")
    @classmethod
    def validar_status(cls, valor: str) -> str:
        """Garante que o status informado pertence às etapas da Trilha SOS."""
        if valor not in STATUS_PERMITIDOS:
            raise ValueError(
                f"Status inválido: '{valor}'. "
                f"Os valores permitidos são: {sorted(STATUS_PERMITIDOS)}"
            )
        return valor


class RecusarPayload(BaseModel):
    """Payload para encerrar a tentativa com um alimento como recusado."""
    crianca_id: UUID
    alimento_id: UUID


class FotoConquistaPayload(BaseModel):
    """Payload para salvar a URL da foto de conquista na etapa Comer."""
    crianca_id: UUID
    alimento_id: UUID
    foto_url: str


class ProgressoUpdate(BaseModel):
    """
    Payload para atualizar a etapa de um progresso já existente.
    """
    status: str = Field(..., examples=["Cheirar"])

    @field_validator("status")
    @classmethod
    def validar_status(cls, valor: str) -> str:
        if valor not in STATUS_PERMITIDOS:
            raise ValueError(
                f"Status inválido: '{valor}'. "
                f"Os valores permitidos são: {sorted(STATUS_PERMITIDOS)}"
            )
        return valor


# ---------------------------------------------------------------------------
# Schemas de RESPONSE
# ---------------------------------------------------------------------------

class ProgressoResponse(BaseModel):
    """
    Representa um registro de progresso como retornado pelo banco.
    """
    id: UUID
    created_at: datetime
    crianca_id: UUID
    alimento_id: UUID
    status: str

    model_config = {"from_attributes": True}


class ProgressoComAlimentoResponse(BaseModel):
    """
    Retorna o progresso junto com os detalhes completos do alimento.
    Útil para montar a trilha visual no app.
    """
    id: UUID
    created_at: datetime
    crianca_id: UUID
    status: str
    alimento: Optional[AlimentoResponse] = None

    model_config = {"from_attributes": True}
