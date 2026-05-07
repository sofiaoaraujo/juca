from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal
import requests

from app.config import settings

router = APIRouter(prefix="/chat", tags=["chat"])

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent"
GEMINI_HEADERS = {"Content-Type": "application/json", "x-goog-api-key": settings.gemini_api_key}

# ─── Modelos ──────────────────────────────────────────────────────────────────

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class FoodProgress(BaseModel):
    name: str
    sosStep: Literal["cheirar", "tocar", "beijar", "provar", "comer"]

class ChildProfile(BaseModel):
    name: str
    age: int  # em meses
    foods: list[FoodProgress]

class ChatRequest(BaseModel):
    messages: list[Message]
    child_profile: ChildProfile

class ChatResponse(BaseModel):
    reply: str

# ─── System prompt ────────────────────────────────────────────────────────────

SOS_STEPS_DESC = {
    "cheirar": "apenas aproxima o alimento e cheira, sem tocá-lo",
    "tocar":   "toca o alimento com as mãos ou utensílio, sem levar à boca",
    "beijar":  "toca o alimento com os lábios ou ponta da língua",
    "provar":  "coloca pequena quantidade na boca e pode ou não engolir",
    "comer":   "mastiga e engole o alimento normalmente",
}

def build_system_prompt(child: ChildProfile) -> str:
    food_lines = "\n".join(
        f"  • {f.name}: etapa \"{f.sosStep}\" ({SOS_STEPS_DESC.get(f.sosStep, '')})"
        for f in child.foods
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

━━━ PERFIL DA CRIANÇA ━━━

Nome: {child.name} | Idade: {child.age} meses

Progresso atual:
{food_lines}

━━━ DIRETRIZES ━━━

- Ajude o pai a entender e usar o app, não só os métodos em geral.
- Use o nome "{child.name}" quando fizer sentido.
- Seja caloroso, encorajador e empático.
- Seja MUITO conciso: 1 parágrafo curto no máximo.
- NUNCA diagnostique condições médicas ou transtornos."""

# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages não pode ser vazio")

    system_prompt = build_system_prompt(body.child_profile)
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
