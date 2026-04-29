import pytest
from pydantic import ValidationError
from app.schemas.progresso import ProgressoCreate, STATUS_PERMITIDOS

UUID_VALIDO = "3fa85f64-5717-4562-b3fc-2c963f66afa6"

@pytest.mark.parametrize("status", sorted(STATUS_PERMITIDOS))
def test_status_aceito(status):
    p = ProgressoCreate(crianca_id=UUID_VALIDO, alimento_id=UUID_VALIDO, status=status)
    assert p.status == status

def test_vocabulario_sos_completo():
    esperado = {"Tolerar", "Interagir", "Cheirar", "Tocar", "Saborear", "Comer", "Recusado"}
    assert STATUS_PERMITIDOS == esperado

@pytest.mark.parametrize("status", ["Aceita", "tolerar", "lamber", ""])
def test_status_invalido_rejeitado(status):
    with pytest.raises(ValidationError):
        ProgressoCreate(crianca_id=UUID_VALIDO, alimento_id=UUID_VALIDO, status=status)
