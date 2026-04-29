# app/main.py
# Ponto de entrada da aplicação JUCA Backend.
# Aqui criamos a instância do FastAPI, registramos os routers
# e configuramos comportamentos globais (CORS, eventos de startup, etc.).

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import criancas, alimentos, progresso, usuarios, alergias, criancas_alergias, neurodivergencia, crianca_neurodivergencia, ia


# ---------------------------------------------------------------------------
# Instância principal do FastAPI
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    description=settings.app_description,
    # Documenta as rotas nos endpoints /docs (Swagger) e /redoc
    docs_url="/docs",
    redoc_url="/redoc",
)


# ---------------------------------------------------------------------------
# Middleware de CORS
# Permite que o frontend (ex: React Native / Flutter) consuma a API.
# Em produção, substitua ["*"] pelos domínios autorizados.
# ---------------------------------------------------------------------------
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Registro dos Routers
# Cada router agrupa endpoints de um domínio específico.
# ---------------------------------------------------------------------------
app.include_router(criancas.router)
app.include_router(alimentos.router)
app.include_router(progresso.router)
app.include_router(usuarios.router)
app.include_router(alergias.router)
app.include_router(criancas_alergias.router)
app.include_router(ia.router)
app.include_router(neurodivergencia.router)
app.include_router(crianca_neurodivergencia.router)

# ---------------------------------------------------------------------------
# Endpoint de Health Check
# ---------------------------------------------------------------------------
@app.get("/", tags=["Health Check"])
async def root():
    """
    Endpoint raiz — verifica se a API está no ar.
    Útil para monitoramento e deploys (Railway, Render, etc.).
    """
    return {
        "status": "online",
        "app": settings.app_title,
        "version": settings.app_version,
        "ambiente": settings.app_env,
        "docs": "/docs",
    }


# ---------------------------------------------------------------------------
# Execução local com Uvicorn
# Execute com: uvicorn app.main:app --reload
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.app_env == "development",
    )
