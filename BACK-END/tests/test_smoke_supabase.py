"""
Smoke test de integração — bate no Supabase real usando service_role.
Skipa se .env não estiver configurado.
"""
import os
import pytest
from app.database import supabase

pytestmark = pytest.mark.skipif(
    not os.getenv("SUPABASE_URL"),
    reason="SUPABASE_URL ausente; rode com .env carregado.",
)

TABELAS = [
    "usuarios", "criancas", "alimentos", "crianca_alimento",
    "alergias", "crianca_alergia",
    "neurodivergencias", "crianca_neurodivergencia",
]

@pytest.mark.parametrize("tabela", TABELAS)
def test_tabela_existe(tabela):
    resp = supabase.table(tabela).select("*").limit(1).execute()
    assert resp.data is not None

def test_progresso_round_trip():
    """Insere etapa SOS válida e remove, validando o CHECK constraint."""
    crianca = supabase.table("criancas").select("id").limit(1).execute()
    alimento = supabase.table("alimentos").select("id").limit(1).execute()
    if not crianca.data or not alimento.data:
        pytest.skip("Banco vazio.")

    inserido = supabase.table("crianca_alimento").insert({
        "crianca_id": crianca.data[0]["id"],
        "alimento_id": alimento.data[0]["id"],
        "status": "Tolerar",
    }).execute()
    assert inserido.data, "INSERT falhou"
    pid = inserido.data[0]["id"]
    supabase.table("crianca_alimento").delete().eq("id", pid).execute()

def test_check_constraint_rejeita_valor_invalido():
    crianca = supabase.table("criancas").select("id").limit(1).execute()
    alimento = supabase.table("alimentos").select("id").limit(1).execute()
    if not crianca.data or not alimento.data:
        pytest.skip("Banco vazio.")
    with pytest.raises(Exception):
        supabase.table("crianca_alimento").insert({
            "crianca_id": crianca.data[0]["id"],
            "alimento_id": alimento.data[0]["id"],
            "status": "lalala_invalido",
        }).execute()
