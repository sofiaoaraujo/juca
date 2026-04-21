# app/schemas/crianca_alergia.py
# Modelos Pydantic para requisições e respostas de alergias de crianças.

from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional

from app.schemas.alergia import AlergiaResponse


# ---------------------------------------------------------------------------
# Schemas de REQUEST
# ---------------------------------------------------------------------------

class CriancaAlergiaCreate(BaseModel):
    """
    Payload para vincular uma alergia a uma criança.
    """
    crianca_id: UUID
    alergia_id: UUID


# ---------------------------------------------------------------------------
# Schemas de RESPONSE
# ---------------------------------------------------------------------------

class CriancaAlergiaResponse(BaseModel):
    """
    Representa o vínculo entre uma criança e uma alergia.
    """
    id: UUID
    created_at: datetime
    crianca_id: UUID
    alergia_id: UUID

    model_config = {"from_attributes": True}


class CriancaAlergiaComDetalhesResponse(BaseModel):
    """
    Retorna o vínculo com os dados completos da alergia embutidos.
    """
    id: UUID
    created_at: datetime
    crianca_id: UUID
    alergia: Optional[AlergiaResponse]

    model_config = {"from_attributes": True}
