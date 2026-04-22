# app/database.py
# Responsável por criar e fornecer o cliente Supabase.
# Utilizamos o service_role key no backend para contornar o RLS
# quando necessário — nunca exponha essa chave no frontend.

from supabase import create_client, Client
from app.config import settings


def get_supabase_client() -> Client:
    """
    Cria e retorna um cliente Supabase usando a service_role key.

    A service_role key bypassa as políticas de Row Level Security (RLS),
    o que é adequado para operações de backend confiáveis. Para operações
    que devem respeitar o RLS (ex.: autenticação do usuário final),
    use a anon_key junto com o token JWT do usuário.
    """
    client: Client = create_client(
        supabase_url=settings.supabase_url,
        supabase_key=settings.supabase_service_key,
    )
    return client


# Cliente global reutilizável — evita recriar a conexão a cada request
supabase: Client = get_supabase_client()
