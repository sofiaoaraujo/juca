# JUCA
## Aplicativo de introdução alimentar voltado para pais de crianças que enfrentam a seletividade alimentar
<img src="./FRONT-END/assets/images/logo.png" width="200" />

App concorrente ao hackathon do Trilha

## Índice
- <a href="#contexto">Contexto Geral</a>
- <a href="#funcionalidades">Funcionalidades</a>
- <a href="#demonstracao">Demonstração</a>
- <a href="#rodar">Como rodar esse projeto?</a>
- <a href="#tecnologias">Tecnologias Utilizadas</a>
- <a href="#autoras">Equipe autoral</a>
- <a href="#passos">Próximos passos</a>

## Contexto Geral

O Juca enfrenta a seletividade alimentar que acomete 80% das crianças atípicas a partir dos métodos:

 - **Food Chaining:** A IA sugere alimentos similares ao já consumidos pela criança em termos de cor, textura e formato
 - **SOS:** O aplicativo cria uma trilha sensorial para cada alimento sugerido, do tolerar ao comer, acompanhando o progresso do usuário
 - **ABA:** Os progressos são revertidos em parabéns e reforços positivos, e o responsável registra com fotos dos alimentos
 - **Acompanhamento Terapêutico:** O aplicativo gera o relatório do progresso da criança em PDF para ser enviado ao terapeuta

## Funcionalidades

 - [x] Login
 - [x] Cadastro do usuário
 - [x] Questionário inicial (onboarding da criança)
 - [x] Sugestão de alimentos via IA (Google Gemini)
 - [x] Trilha sensorial (tolerar → cheirar → tocar → provar → comer)
 - [x] Registro de conquistas com foto
 - [x] Galeria de conquistas
 - [x] Relatório terapêutico em PDF
 - [x] Assistente Juca — chatbot com IA para tirar dúvidas dos pais
 - [x] Configurações para adicionar e gerir perfis das crianças

## Demonstração

## Como rodar esse projeto?

### Pré-requisitos
- Node.js
- Python 3.12
- Expo Go instalado no celular

### Clone o repositório
```bash
git clone https://github.com/sofiaoaraujo/juca.git
cd juca
```

### Variáveis de ambiente (Back-end)

Após copiar o `.env.example` para `.env`, preencha as seguintes chaves:

| Variável | Como obter |
|---|---|
| `SUPABASE_URL` | [supabase.com](https://supabase.com) → Configurações do Projeto → API |
| `SUPABASE_ANON_KEY` | [supabase.com](https://supabase.com) → Configurações do Projeto → API |
| `SUPABASE_SERVICE_KEY` | [supabase.com](https://supabase.com) → Configurações do Projeto → API |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Criar chave API |

### Variáveis de ambiente (Front-end)

Crie um arquivo `.env` dentro da pasta `FRONT-END/`:

```
EXPO_PUBLIC_BACKEND_URL=http://SEU_IP:8000
EXPO_PUBLIC_SUPABASE_URL=sua_url_do_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
EXPO_PUBLIC_GEMINI_API_KEY=sua_chave_gemini
```

### Back-end
```bash
cd BACK-END
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # preencha com suas chaves
uvicorn app.main:app --reload --host 0.0.0.0
```

### Front-end
```bash
cd FRONT-END
npm install
npx expo start --lan
```

## Tecnologias Utilizadas

### Back-end
1. [Python](https://www.python.org/) com [FastAPI](https://fastapi.tiangolo.com/)
2. [Supabase](https://supabase.com/) — banco de dados PostgreSQL
3. [Google Gemini](https://deepmind.google/technologies/gemini/) — IA para sugestões alimentares e chatbot

### Front-end
1. [React Native](https://reactnative.dev/) com [Expo](https://expo.dev/)
2. [TypeScript](https://www.typescriptlang.org/) — linguagem tipada
3. [Expo Router](https://expo.github.io/router/) — navegação baseada em arquivos
4. [Google Gemini](https://deepmind.google/technologies/gemini/) — Assistente Juca (chatbot)

## Equipe Autoral

| Nome | GitHub | LinkedIn |
|---|---|---|
| Sofia Oliveira Araújo | [@sofiaoaraujo](https://github.com/sofiaoaraujo) | [Sofia Araújo](https://www.linkedin.com/in/sofia-araújo-439178294) |
| Mikael Rodrigues dos Santos | [@MikaelRodriguess](https://github.com/MikaelRodriguess) | [Mikael Rodrigues](https://www.linkedin.com/in/mikael-rodrigues-690b48373) |
| Pierre Queiroz C. Pereira | [@pierrequeiroz2006](https://github.com/pierrequeiroz2006) | [Pierre Queiroz](https://www.linkedin.com/in/pierrequeiroz) |

## Próximos Passos

 - [ ] Notificações de progresso
 - [ ] Modo offline parcial
 - [ ] Histórico de conversas com o Assistente Juca
 - [ ] Geração de receitas com os alimentos seguros e de introdução
 - [ ] Atividades lúdicas para familiarizar a criança com os alimentos
