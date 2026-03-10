# Quick Start - EiBolsa

Comece a usar o EiBolsa em menos de 5 minutos!

## Pré-requisitos

- Docker e Docker Compose instalados
- Uma chave de API da OpenAI (obtenha em https://platform.openai.com/api-keys)

## Setup em 3 Passos

### 1. Clone e Configure

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env e adicionar sua OpenAI API Key
# OPENAI_API_KEY=sk-proj-seu-api-key-aqui
nano .env  # ou use seu editor favorito
```

### 2. Inicie com Docker Compose

```bash
# Build das imagens e iniciar serviços
docker-compose up --build

# Aguarde até ver:
# "Uvicorn running on http://0.0.0.0:8000"
# "ready - started server on 0.0.0.0:3000"
```

### 3. Acesse a Aplicação

- **Frontend**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs

## Uso

1. Digite um ticker (ex: **AAPL**, **MSFT**, **TSLA**)
2. Clique em "Analisar"
3. Aguarde a análise com IA
4. Veja a recomendação: **COMPRAR**, **VENDER** ou **ESPERAR**

## Desenvolvimento Local (Sem Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
export OPENAI_API_KEY=sk-proj-seu-api-key
uvicorn main:app --reload
```

Backend em: http://localhost:8000

### Frontend (em novo terminal)

```bash
npm install
export NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Frontend em: http://localhost:3000

## Tickers Populares para Testar

- **AAPL** - Apple Inc.
- **MSFT** - Microsoft Corporation
- **TSLA** - Tesla Inc.
- **GOOGL** - Alphabet Inc.
- **AMZN** - Amazon.com Inc.

## Parar Serviços

```bash
# Se usar Docker Compose
docker-compose down

# Para remover volumes
docker-compose down -v
```

## Próximos Passos

1. Leia [README.md](./README.md) para documentação completa
2. Leia [DEVELOPMENT.md](./DEVELOPMENT.md) para desenvolvimento
3. Leia [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) para problemas
4. Explore [backend/main.py](./backend/main.py) para ver endpoints
5. Explore [components/stock-analysis.tsx](./components/stock-analysis.tsx) para UI

## Estrutura de Pastas

```
.
├── backend/              # Python FastAPI
├── components/           # React Components
├── app/                  # Next.js Pages
├── lib/                  # Utilitários
├── docker-compose.yml    # Orquestração
└── README.md            # Documentação
```

## Comandos Úteis

```bash
# Ver logs
docker-compose logs -f

# Ver status
docker-compose ps

# Rebuild sem cache
docker-compose build --no-cache

# Acessar container
docker-compose exec backend bash
docker-compose exec frontend bash

# Testar API
curl http://localhost:8000/health

# Testar análise
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL"}'
```

## Troubleshooting Rápido

### "Cannot connect to API"
- Verificar se backend está rodando: `curl http://localhost:8000/health`
- Verificar `NEXT_PUBLIC_API_URL=http://localhost:8000` em `.env`

### "Incorrect API key"
- Verificar se `OPENAI_API_KEY` está correto em `.env`
- Gerar nova chave em https://platform.openai.com/api-keys

### "Address already in use"
- Mudar porta em `docker-compose.yml`
- Ou matar processo: `lsof -ti:8000 | xargs kill -9`

Mais ajuda em [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## Suporte

- 📖 [README.md](./README.md) - Documentação completa
- 💻 [DEVELOPMENT.md](./DEVELOPMENT.md) - Guia de desenvolvimento
- 🔧 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Resolução de problemas
- 🐛 GitHub Issues - Reporte bugs

## Próximo Nível

Quer aprender mais?

- [ ] Modificar modelo de LLM em `backend/stock_analyzer.py`
- [ ] Adicionar novos indicadores técnicos
- [ ] Customizar cores/tema em `app/globals.css`
- [ ] Implementar autenticação
- [ ] Adicionar banco de dados
- [ ] Deploy em nuvem (Vercel + Railway)

---

**Aproveite! Agora você tem um sistema de análise de ações com IA rodando localmente.** 🚀

Qualquer dúvida? Veja [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
