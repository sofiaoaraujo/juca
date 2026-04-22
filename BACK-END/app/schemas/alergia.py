<<<<<<< HEAD
# app/schemas/alergia.py
# Modelos Pydantic para requisições e respostas de alergias.

from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional


# ---------------------------------------------------------------------------
# Schemas de REQUEST
# ---------------------------------------------------------------------------

class AlergiaCreate(BaseModel):
    """
    Payload para cadastrar uma nova alergia.
    """
    nome: str = Field(..., min_length=2, max_length=100, examples=["Glúten"])

class AlergiaUpdate(BaseModel):
    """
    Payload para atualização parcial de uma alergia.
    """

    nome: Optional[str] = Field(default=None, min_length=2, max_length=100)

# ---------------------------------------------------------------------------
# Schemas de RESPONSE
# ---------------------------------------------------------------------------   

class AlergiaResponse(BaseModel):
    """
    Representa uma alergia a ser retornada pelo banco de dados.
    """
    id: UUID
    created_at: datetime
    nome: str

=======
# app/schemas/alergia.py
# Modelos Pydantic para requisições e respostas de alergias.

from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional


# ---------------------------------------------------------------------------
# Schemas de REQUEST
# ---------------------------------------------------------------------------

class AlergiaCreate(BaseModel):
    """
    Payload para cadastrar uma nova alergia.
    """
    nome: str = Field(..., min_length=2, max_length=100, examples=["Glúten"])

class AlergiaUpdate(BaseModel):
    """
    Payload para atualização parcial de uma alergia.
    """

    nome: Optional[str] = Field(default=None, min_length=2, max_length=100)

# ---------------------------------------------------------------------------
# Schemas de RESPONSE
# ---------------------------------------------------------------------------   

class AlergiaResponse(BaseModel):
    """
    Representa uma alergia a ser retornada pelo banco de dados.
    """
    id: UUID
    created_at: datetime
    nome: str

>>>>>>> ef25c7caa69076bfa0f73e8de86823f5899f27dc
    model_config = {"from_attributes": True }