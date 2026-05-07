# JUCA
## Aplicativo de introdução alimentar voltado para pais de crianças que enfrentam a seletividade alimentar
<img src="./FRONT-END/assets/images/logo.png" width="200" />

App creferente ao hackathon do Trilha 2025.2

## Índice
- [Contexto Geral](#contexto-geral)
- [Funcionalidades](#funcionalidades)
- [Demonstração](#demonstração)
- [Como rodar esse projeto?](#como-rodar-esse-projeto)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Equipe Autoral](#equipe-autoral)
- [Próximos Passos](#próximos-passos)

## Contexto Geral

O Juca enfrenta a seletividade alimentar que acomete 80% das crianças atípicas a partir dos métodos:

 - Food Chaining: A IA sugere alimentos similares ao já consumidos pela criança em termos de cor, textura e formato
 - SOS: O aplicativo cria uma trilha sensorial para cada alimentos sugerido, do tolerar ao comer, onde acompanha o progresso do usuário
 - ABA: Os progressos são revertidos em parabéns, reforços positivos e o responsável da criança registra com fotos dos alimentos
 - Acompanhamento Terapêutico: O aplicativo gera o relatório do progresso da criança em pdf para ser mandado no WhatsApp e acompanhado pelo terapeuta
 - Assistente Juca: Um chatbot que tira dúvidas dos usuários sobre seletividade alimentar, os métodos do app e o progresso da criança

## Funcionalidades

 - [x] Login  
 - [x] Cadastro do usuário  
 - [x] Questionário inicial  
 - [x] Sugestão de comidas  
 - [x] Trilha sensorial
 - [x] Progresso e relatório terapêutico  
 - [x] Galeria fotográfica das conquistas
 - [x] Chatbot para dúvidas sobre seletividade alimentar
 - [x] Configurações para adicionar e gerir contas das crianças

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
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Tenha chave API |

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
# no arquivo .env, coloque o IP do seu computador em EXPO_PUBLIC_BACKEND_URL
npx expo start --lan
```

## Tecnologias Utilizadas

### Back-end
1. [Python](https://www.python.org/) com [FastAPI](https://fastapi.tiangolo.com/)
2. [Supabase](https://supabase.com/) — banco de dados PostgreSQL
3. [Google Gemini](https://deepmind.google/technologies/gemini/) — inteligência artificial para sugestões alimentares

### Front-end
1. [React Native](https://reactnative.dev/) com [Expo](https://expo.dev/)
2. [TypeScript](https://www.typescriptlang.org/) — linguagem tipada
3. [Expo Router](https://expo.github.io/router/) — navegação

## Equipe Autoral

| Nome | GitHub | Linkedln |
|---|---|---|
| Sofia Oliveira Araújo | [@sofiaoaraujo](https://github.com/sofiaoaraujo) | [Sofia Araújo](https://www.linkedin.com/in/sofia-araújo-439178294?utm_source=share_via&utm_content=profile&utm_medium=member_android) |
| Mikael Rodrigues dos Santos | [@MikaelRodriguess](https://github.com/MikaelRodriguess) | [Mikael Rodrigues](https://www.linkedin.com/in/mikael-rodrigues-690b48373?utm_source=share_via&utm_content=profile&utm_medium=member_android) |
| Pierre Queiroz C. Pereira | [@pierrequeiroz2006](https://github.com/pierrequeiroz2006) | [Pierre Queiroz](https://www.linkedin.com/in/pierrequeiroz?utm_source=share_via&utm_content=profile&utm_medium=member_android) |

## Próximos Passos

 - [ ] Avatar no jogo que vai se tornando mais forte a partir da alimentação da criança
 - [ ] Geração de receitas com os alimentos seguros e de introdução
 - [ ] Atividades lúdicas para familiarizar a criança com os alimentos
