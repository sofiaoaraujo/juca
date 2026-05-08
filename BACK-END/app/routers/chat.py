from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal, Optional
import requests

from app.config import settings
from app.database import supabase

router = APIRouter(prefix="/chat", tags=["chat"])

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent"
GEMINI_HEADERS = {"Content-Type": "application/json", "x-goog-api-key": settings.gemini_api_key}

# ─── Modelos ──────────────────────────────────────────────────────────────────

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]
    user_id:  Optional[str] = None
    child_id: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str

# ─── Mapeamento dos status reais do banco para descrição SOS ──────────────────

SOS_STEPS_MAP = {
    "Tolerar":   "tolera a presença do alimento no prato",
    "Interagir": "interage com o alimento",
    "Cheirar":   "aproxima e cheira o alimento",
    "Lamber":     "encosta a boca no alimento",
    "Saborear":  "prova pequena quantidade",
    "Comer": "come o alimento",
}

# ─── Busca de contexto no banco de dados ─────────────────────────────────────

def buscar_contexto(user_id: str | None, child_id: str | None) -> dict:
    """
    Retorna nome do cuidador, nome da criança e alimentos em introdução.
    Usa a service_role key (já instanciada em database.py), portanto bypassa o
    RLS. A segurança é garantida filtrando cuidador_id = user_id nas queries.
    """
    nome_cuidador = "Cuidador"
    nome_crianca:  Optional[str] = None
    alimentos:     list[dict]    = []

    # ── 1. Nome do cuidador ───────────────────────────────────────────────────
    if user_id:
        try:
            resp = (
                supabase.table("usuarios")
                .select("nome")
                .eq("user_id", user_id)
                .maybe_single()
                .execute()
            )
            if resp.data:
                nome_cuidador = resp.data.get("nome") or "Cuidador"
        except Exception:
            pass  # fallback: "Cuidador"

    # ── 2. Nome da criança (com verificação de ownership) ────────────────────
    if child_id and user_id:
        try:
            resp_crianca = (
                supabase.table("criancas")
                .select("nome")
                .eq("id", child_id)
                .eq("cuidador_id", user_id)   # garante que a criança pertence a este cuidador
                .maybe_single()
                .execute()
            )
            if resp_crianca.data:
                nome_crianca = resp_crianca.data.get("nome")
        except Exception:
            pass

    # ── 3. Alimentos em introdução (exclui Recusado e Comer) ─────────────────
    if child_id and user_id:
        try:
            resp_alimentos = (
                supabase.table("crianca_alimento")
                .select("status, alimentos(nome)")
                .eq("crianca_id", child_id)
                .filter("status", "not.in", '("Recusado","Comer")')
                .execute()
            )
            vistos: set[str] = set()
            for item in resp_alimentos.data or []:
                nome_alimento = (item.get("alimentos") or {}).get("nome")
                status        = item.get("status", "")
                if nome_alimento and nome_alimento not in vistos:
                    vistos.add(nome_alimento)
                    alimentos.append({"nome": nome_alimento, "etapa": status})
        except Exception:
            pass

    return {
        "nome_cuidador": nome_cuidador,
        "nome_crianca":  nome_crianca,
        "alimentos":     alimentos,
    }

# ─── System prompt ────────────────────────────────────────────────────────────

def build_system_prompt(ctx: dict) -> str:
    nome_cuidador = ctx["nome_cuidador"]
    nome_crianca  = ctx["nome_crianca"]
    alimentos     = ctx["alimentos"]

    if alimentos:
        food_lines = "\n".join(
            f"  • {a['nome']}: etapa \"{a['etapa']}\" ({SOS_STEPS_MAP.get(a['etapa'], a['etapa'])})"
            for a in alimentos
        )
    else:
        food_lines = "  (nenhum alimento em introdução registrado no momento)"

    crianca_bloco = (
        f"A criança acompanhada é {nome_crianca}."
        if nome_crianca
        else "(nenhuma criança selecionada no momento)"
    )

    diretriz_crianca = (
        f'- Use o nome "{nome_crianca}" ao se referir à criança.'
        if nome_crianca
        else ""
    )

    return f"""Você é o Assistente Juca, integrado ao aplicativo JUCA — um app para pais de crianças com seletividade alimentar, especialmente crianças atípicas (TEA e neurodivergentes).

━━━ O QUE O APP JUCA FAZ ━━━

- A IA sugere alimentos novos baseados nos que a criança já aceita (Food Chaining).
- Para cada alimento sugerido, o app cria uma Trilha sensorial com etapas progressivas (Método SOS): cheirar → tocar → beijar → provar → comer.
- O pai registra o progresso da criança em cada etapa, com fotos e reforço positivo (ABA).
- O app gera um relatório terapêutico do progresso para compartilhar com o terapeuta.

━━━ MÉTODOS ━━━

- SOS: hierarquia sensorial progressiva — cada interação positiva com o alimento é progresso.
- ABA: reforço positivo imediato para comportamentos alimentares desejados.
- Food Chaining: expande o repertório a partir de alimentos âncora, mudando textura, sabor ou forma.

━━━ CONTEXTO DO USUÁRIO (extraído do banco de dados) ━━━

Você está conversando com {nome_cuidador}.
{crianca_bloco}

Alimentos que a criança está introduzindo atualmente:
{food_lines}

━━━ DIRETRIZES ━━━

- Ajude o pai a entender e usar o app, não só os métodos em geral.
- Use o nome "{nome_cuidador}" ao se dirigir ao cuidador.
{diretriz_crianca}
- Baseie suas respostas ESTRITAMENTE nos alimentos listados acima — não cite alimentos que não estejam nessa lista.
- Seja caloroso, encorajador e empático.
- Seja MUITO conciso: 1 parágrafo curto no máximo.
- NUNCA diagnostique condições médicas ou transtornos."""

# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages não pode ser vazio")

    # Busca contexto real no banco antes de chamar a IA
    ctx           = buscar_contexto(body.user_id, body.child_id)
    system_prompt = build_system_prompt(ctx)

    # Filtra mensagem de boas-vindas do assistente no início do histórico
    msgs = [m for i, m in enumerate(body.messages) if not (i == 0 and m.role == "assistant")]

    if not msgs:
        raise HTTPException(status_code=400, detail="Nenhuma mensagem de usuário encontrada")

    # Embute o system prompt na primeira mensagem do usuário
    contents = []
    for i, m in enumerate(msgs):
        role = "user" if m.role == "user" else "model"
        text = f"{system_prompt}\n\n{m.content}" if i == 0 else m.content
        contents.append({"role": role, "parts": [{"text": text}]})

    payload = {
        "contents": contents,
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 300},
    }

    try:
        response = requests.post(GEMINI_URL, json=payload, headers=GEMINI_HEADERS)
        response.raise_for_status()
        dados = response.json()
        reply_text = dados["candidates"][0]["content"]["parts"][0]["text"]
    except requests.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Erro na API Gemini: {e}")
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail="Resposta inesperada da API Gemini")

    return ChatResponse(reply=reply_text)
