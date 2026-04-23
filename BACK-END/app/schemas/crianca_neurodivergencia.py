# app/schemas/crianca_neurodivergencia.py
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class CriancaNeurodivergenciaCreate(BaseModel):
    crianca_id: UUID
    neurodivergencia_id: UUID

class CriancaNeurodivergenciaResponse(BaseModel):
    id: UUID
    created_at: datetime
    crianca_id: UUID
    neurodivergencia_id: UUID

    model_config = {"from_attributes": True}