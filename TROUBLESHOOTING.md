# Troubleshooting Guide - EiBolsa

## Problemas Comuns e Soluções

### 1. Backend não inicia

#### Erro: "ModuleNotFoundError: No module named 'fastapi'"

**Solução:**
```bash
cd backend
pip install -r requirements.txt
```

#### Erro: "OPENAI_API_KEY not set"

**Solução:**
```bash
# Create .env file in backend directory
cp .env.example .env

# Add your OpenAI API key
echo "OPENAI_API_KEY=sk-proj-your-key-here" >> .env

# Export the variable
export OPENAI_API_KEY=sk-proj-your-key-here
```

#### Erro: "Address already in use :8000"

**Solução:**
```bash
# Kill processo na porta 8000
# macOS/Linux:
lsof -ti:8000 | xargs kill -9

# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Ou use porta diferente
uvicorn main:app --port 8001
```

---

### 2. Frontend não conecta ao Backend

#### Erro: "Failed to fetch from API"

**Checklist:**
1. Backend está rodando? 
   ```bash
   curl http://localhost:8000/health
   ```

2. `NEXT_PUBLIC_API_URL` está correto?
   ```bash
   # Check .env file
   cat .env.local
   # Should show: NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. CORS habilitado no backend?
   - Verificar em `backend/main.py` se `CORSMiddleware` está configurado

#### Erro: "API URL is undefined"

**Solução:**
```bash
# Create .env.local
cp .env.example .env.local

# Restart frontend
npm run dev
```

#### Erro: "404 POST /analyze"

**Solução:**
```bash
# Verificar se o endpoint existe
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL"}'
```

---

### 3. Problemas com Docker Compose

#### Erro: "Docker daemon is not running"

**Solução:**
```bash
# macOS: Abrir Docker Desktop app

# Linux: Iniciar Docker
sudo systemctl start docker

# Windows: Abrir Docker Desktop
```

#### Erro: "Cannot connect to Docker daemon"

**Solução:**
```bash
# Verificar permissões (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalação
docker --version
docker-compose --version
```

#### Containers saem do ar

**Diagnóstico:**
```bash
# Ver logs
docker-compose logs -f

# Ver status
docker-compose ps

# Reconstruir sem cache
docker-compose down -v
docker-compose up --build
```

#### Erro: "bind: address already in use"

**Solução:**
```bash
# Verificar portas em uso
# macOS/Linux
lsof -i :3000
lsof -i :8000

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Liberar portas
docker-compose down
# Ou mudar portas em docker-compose.yml
```

---

### 4. Problemas com yfinance

#### Erro: "No data found for ticker XXXX"

**Solução:**
- Ticker inválido ou não existe
- Usar apenas tickers válidos (AAPL, MSFT, etc.)
- Verificar no [Yahoo Finance](https://finance.yahoo.com/)

#### Erro: "429 Too Many Requests"

**Solução:**
- yfinance pode ter rate limiting
- Aguardar alguns minutos antes de tentar novamente
- Em produção, implementar cache com Redis

```python
# backend/stock_analyzer.py - Adicionar retry logic
from tenacity import retry, wait_exponential

@retry(wait=wait_exponential(multiplier=1, min=4, max=10))
def get_stock_data(self, ticker: str):
    # ... existing code
```

---

### 5. Problemas com LangChain/OpenAI

#### Erro: "AuthenticationError: Incorrect API key"

**Solução:**
```bash
# Verificar API key
echo $OPENAI_API_KEY

# Gerar nova key em https://platform.openai.com/api-keys

# Atualizar em backend/.env
OPENAI_API_KEY=sk-proj-new-key-here
```

#### Erro: "RateLimitError: Rate limit exceeded"

**Solução:**
- OpenAI API tem rate limits
- Aguardar alguns minutos
- Considerar upgrade de plano em https://platform.openai.com/account/billing/limits

#### Erro: "Model gpt-4-turbo-preview not available"

**Solução:**
```python
# backend/stock_analyzer.py
self.llm = ChatOpenAI(
    model="gpt-4-turbo",  # Ou gpt-3.5-turbo para menor custo
    temperature=0.7,
)
```

---

### 6. Problemas de Performance

#### Frontend está lento

**Checklist:**
1. Verificar em DevTools > Network
2. API está respondendo rápido?
   ```bash
   time curl http://localhost:8000/health
   ```
3. Usar React DevTools para debug
4. Verificar se não há console errors

#### Backend está lento

**Checklist:**
```bash
# Analisar tempo de resposta
time curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL"}'
```

**Otimizações:**
- Implementar cache com Redis
- Usar modelo menor de LLM (gpt-3.5-turbo)
- Limitar chamadas a yfinance

---

### 7. Problemas com Dependências

#### Erro: "pip install failed"

**Solução:**
```bash
cd backend
# Limpar cache
pip cache purge

# Reinstalar
pip install -r requirements.txt --force-reinstall
```

#### Erro: "npm ERR! code ERESOLVE"

**Solução:**
```bash
# Usar flag legacy
npm install --legacy-peer-deps

# Ou
npm install --force
```

---

### 8. Git/GitHub Issues

#### Erro: "Cannot pull latest changes"

**Solução:**
```bash
git stash
git pull origin main
```

#### Arquivo grande não faz commit

**Solução:**
```bash
# Adicionar em .gitignore
echo "*.env" >> .gitignore
echo "node_modules/" >> .gitignore
echo "venv/" >> .gitignore

# Remover de git history (se necessário)
git rm --cached backend/.env
```

---

## Debug Mode

### Ativar Logs Detalhados

#### Backend
```python
# backend/main.py
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Use logger.debug() instead of print()
logger.debug(f"Analyzing ticker: {ticker}")
```

#### Frontend
```tsx
// Use console.log com prefixo [v0]
console.log("[v0] API Response:", data);
console.error("[v0] Error occurred:", error);
```

### Chrome DevTools

1. Abrir DevTools (F12)
2. Console: Ver mensagens de log
3. Network: Ver requisições HTTP
4. React DevTools: Inspecionar estado de componentes

---

## Verificação de Saúde

### Script de Teste Automático

```bash
# Executar testes da API
bash scripts/test-api.sh

# Ou especificar URL customizada
bash scripts/test-api.sh http://api.example.com:8000
```

### Manual Health Check

```bash
# Backend saúde
curl -s http://localhost:8000/health | jq .

# Frontend acessível
curl -s http://localhost:3000 | head -20

# Endpoint de análise
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL"}'
```

---

## Recursos Úteis

### Documentação
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Next.js Docs](https://nextjs.org/docs)
- [yfinance Issues](https://github.com/ranaroussi/yfinance/issues)
- [LangChain Docs](https://python.langchain.com/)

### Comunidades
- [OpenAI Community](https://community.openai.com/)
- [Stack Overflow](https://stackoverflow.com/) - tag: fastapi, nextjs, python
- [GitHub Discussions](https://github.com/search?type=discussions&q=eibola)

### Ferramentas Úteis
- [Postman](https://www.postman.com/) - Testar APIs
- [VS Code REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) - Testar requests
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/) - Debug frontend

---

## Reportar Issues

Se o problema não estiver listado aqui:

1. Coletar informações
   ```bash
   # Versões
   python --version
   node --version
   npm --version
   docker --version
   
   # Logs
   docker-compose logs > logs.txt
   ```

2. Abrir issue no GitHub com:
   - Descrição clara do problema
   - Passos para reproduzir
   - Mensagens de erro
   - Versões do software
   - Sistema operacional

3. Fornecer contexto
   - Quando começou?
   - O que mudou recentemente?
   - Trabalhou antes?

---

## Checklist Final

Antes de solicitar ajuda, verificar:

- [ ] Node.js e Python instalados
- [ ] Docker e Docker Compose funcionando
- [ ] OpenAI API key válida
- [ ] NEXT_PUBLIC_API_URL correto
- [ ] Backend iniciando sem erros
- [ ] Frontend conectando ao backend
- [ ] `curl` pode alcançar endpoints
- [ ] Firewall/antivírus não bloqueando portas
- [ ] Sem proxy entre client e server

---

Good luck troubleshooting! 🔍
