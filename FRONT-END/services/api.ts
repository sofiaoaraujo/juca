import axios from 'axios';

const API_BASE_URL = 'http://192.168.0.5:8000'; // Em produção, troque pelo IP/domínio real, Se estiver testando em celular físico 
                                              // ou emulador Android, troque localhost pelo IP da sua máquina na rede (ex: 192.168.1.10), 
                                              // porque o celular não reconhece localhost como sendo o seu PC

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,                             // Tempo limite de 10 segundos para as requisições 
  headers: {
    'Content-Type': 'application/json',       // Tipo de conteúdo para as requisições 
  },
});

export default api;                           // Exporta a instância do axios para ser usada em outros arquivos do projeto
