# app/schemas/neurodivergencia.py
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional

class NeurodivergenciaCreate(BaseModel):
    # Nota: Coloquei 'nome' aqui seguindo o padrão das suas tabelas de alimentos e alergias.
    # Se no banco de dados a coluna se chamar 'neurodivergencia', troque a palavra 'nome' abaixo.
    neurodivergencia: str 

class NeurodivergenciaResponse(BaseModel):
    id: UUID
    created_at: datetime
    neurodivergencia: str

    model_config = {"from_attributes": True}