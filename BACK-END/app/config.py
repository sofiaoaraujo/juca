# app/config.py
# Lê as variáveis de ambiente e as disponibiliza de forma tipada
# para o resto da aplicação via pydantic-settings.

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Centraliza todas as configurações da aplicação.
    O pydantic-settings carrega automaticamente do arquivo .env.
    """

    # --- Supabase ---
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str

    # --- Gemini ---
    gemini_api_key: str

    # --- App ---
    app_env: str = "development"
    app_title: str = "JUCA API"
    app_version: str = "0.1.0"
    app_description: str = (
        "Backend do aplicativo JUCA — auxiliando pais na introdução "
        "alimentar de crianças com TEA através da Trilha (ABA)."
    )

    # CSV de origens autorizadas. Em dev pode ser "http://localhost:8081,exp://..."
    cors_origins: str = "http://localhost:8081"

    # Instrui o pydantic-settings a ler o arquivo .env na raiz do projeto
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# Instância única (singleton) reutilizada em toda a aplicação
settings = Settings()
