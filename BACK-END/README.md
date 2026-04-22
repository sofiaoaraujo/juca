# JUCA Backend 🍎

Backend do aplicativo **JUCA** — auxiliando pais na introdução alimentar de crianças com TEA através da **Trilha Duolingo**, baseada nos princípios da terapia **ABA**.

---

## 🗂️ Estrutura de Pastas

```
juca-backend/
├── app/
│   ├── __init__.py
│   ├── main.py          ← Ponto de entrada, instância FastAPI, CORS
│   ├── config.py        ← Variáveis de ambiente (Pydantic Settings)
│   ├── database.py      ← Cliente Supabase
│   ├── schemas/
│   │   ├── crianca.py   ← Modelos Pydantic de Criança
│   │   ├── alimento.py  ← Modelos Pydantic de Alimento
│   │   └── progresso.py ← Modelos Pydantic do Progresso (Trilha ABA)
│   └── routers/
│       ├── criancas.py  ← CRUD de Crianças
│       ├── alimentos.py ← CRUD de Alimentos
│       └── progresso.py ← Progresso na Trilha ABA
├── .env                 ← Suas credenciais (NÃO commitar!)
├── .env.example         ← Template de variáveis de ambiente
├── requirements.txt
└── README.md
```

---

## ⚙️ Configuração

### 1. Clone e crie o ambiente virtual

```bash
python -m venv .venv
source .venv/bin/activate      # Linux/Mac
.venv\Scripts\activate         # Windows
pip install -r requirements.txt
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais do Supabase:

```env
SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
APP_ENV=development
```

> 🔑 Encontre suas chaves em: **Supabase Dashboard → Project Settings → API**

### 3. Inicie o servidor

```bash
uvicorn app.main:app --reload
```

Acesse: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🛤️ Endpoints Disponíveis

### 🌱 Health Check
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Status da API |

### 👶 Crianças
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/criancas/` | Listar todas as crianças |
| GET | `/criancas/{id}` | Buscar criança por ID |
| POST | `/criancas/` | Cadastrar nova criança |
| PATCH | `/criancas/{id}` | Atualizar dados da criança |

### 🍎 Alimentos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/alimentos/` | Listar catálogo de alimentos |
| GET | `/alimentos/{id}` | Buscar alimento por ID |
| POST | `/alimentos/` | Cadastrar novo alimento |
| PATCH | `/alimentos/{id}` | Atualizar alimento |

### 🏆 Progresso (Trilha ABA)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/progresso/` | Registrar progresso |
| GET | `/progresso/crianca/{id}` | Trilha completa da criança |
| GET | `/progresso/crianca/{id}/alimento/{id}` | Progresso com alimento específico |
| PATCH | `/progresso/{id}` | Atualizar etapa do progresso |

---

## 🧠 Etapas da Trilha ABA

```
Tocar → Cheirar → Lamber → Comer → Aceita
                                  ↘ Recusado (qualquer etapa)
```

---

## 📌 Próximos Passos Sugeridos

- [ ] Adicionar autenticação JWT via Supabase Auth
- [ ] Aplicar RLS (Row Level Security) no Supabase para isolar dados por cuidador
- [ ] Endpoints para `alergias` e `crianca_alergia`
- [ ] Sistema de notificações / lembretes de sessão
- [ ] Histórico de progresso com timestamps por etapa
