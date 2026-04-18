import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

#Criação do FastAPI
app = FastAPI()

#Lista de origins permitidas para o Cross-Origin Resoucer Sharing(CORS)
origins = [
    "http://localhost:3000",
    "http://192.168.0.7:8000/",     #Ideal
    "*"                             #Utilizando isso apenas para o desenvolvimento, não é recomendado para produção
]

#Configurando o CORS, mecanismo que fiscaliza as requisições.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  #Lista dos origins permitidos
    allow_credentials=True,
    allow_methods=["*"],    #Permite todos os métodos
    allow_headers=["*"],    #Permite todos os headers
)

#Criação de uma roda raiz para testar a API
@app.get("/")
async def root():
    return {"message": "Hello World"}

#Trava de segurança
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
