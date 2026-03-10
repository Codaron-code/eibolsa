# API Reference - EiBolsa

Documentação completa dos endpoints da API do EiBolsa.

## Base URL

```
http://localhost:8000  (Local Development)
http://api.example.com (Production)
```

## Endpoints

### 1. Health Check

Verifica se a API está funcionando.

**Endpoint:**
```
GET /health
```

**Resposta (200):**
```json
{
  "status": "ok",
  "service": "EiBolsa API"
}
```

**Exemplo cURL:**
```bash
curl http://localhost:8000/health
```

---

### 2. Analisar Ação

Executa análise completa de uma ação com recomendação de IA.

**Endpoint:**
```
POST /analyze
```

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "ticker": "AAPL"
}
```

**Parâmetros:**
- `ticker` (string, obrigatório): Símbolo da ação (ex: AAPL, MSFT, TSLA)
  - Tamanho: 1-10 caracteres
  - Maiúsculas recomendadas

**Resposta (200):**
```json
{
  "ticker": "AAPL",
  "company_name": "Apple Inc.",
  "current_price": "$180.75",
  "price_change_percent": "+2.45%",
  "recommendation": "COMPRAR",
  "confidence": 85,
  "reasoning": "A ação mostra sinais positivos com RSI em 65, acima da média móvel de 50 dias. Market cap saudável e dividend yield atraente.",
  "risks": [
    "Volatilidade do setor de tecnologia",
    "Possíveis oscilações de taxa de juros",
    "Competição no mercado de eletrônicos"
  ],
  "opportunities": [
    "Crescimento esperado em IA e ML",
    "Expansão de serviços em nuvem",
    "Demanda crescente de produtos Apple"
  ],
  "key_metrics": {
    "pe_ratio": "28.50",
    "dividend_yield": "0.46%",
    "market_cap": "$2.89T",
    "week_52_high": "$199.62",
    "week_52_low": "$164.08",
    "avg_volume": "52.3M",
    "rsi": "65.23",
    "ma_20": "$176.45",
    "ma_50": "$175.20"
  },
  "news_summary": [
    {
      "title": "Apple anuncia novos produtos",
      "sentiment": "positivo",
      "summary": "Empresa apresenta inovações em IA integrada aos produtos"
    },
    {
      "title": "Regulação na EU pode impactar App Store",
      "sentiment": "negativo",
      "summary": "Novas regulações da União Europeia podem afetar modelo de negócio"
    }
  ],
  "analysis_date": "2024-01-15T10:30:00.123456"
}
```

**Códigos de Resposta:**

| Código | Descrição |
|--------|-----------|
| 200 | Análise bem-sucedida |
| 400 | Ticker inválido ou vazio |
| 500 | Erro do servidor (backend, yfinance, OpenAI, etc) |

**Erros (400):**
```json
{
  "detail": "Ticker não pode estar vazio"
}
```

**Erros (500):**
```json
{
  "detail": "Erro ao analisar ação: AAPL ticker não encontrado"
}
```

**Exemplo cURL:**
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL"}'
```

**Exemplo Python:**
```python
import requests

url = "http://localhost:8000/analyze"
data = {"ticker": "AAPL"}
response = requests.post(url, json=data)
print(response.json())
```

**Exemplo JavaScript/TypeScript:**
```typescript
const response = await fetch('http://localhost:8000/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ticker: 'AAPL' })
});
const data = await response.json();
console.log(data);
```

---

### 3. Listar Tickers Populares

Retorna lista de tickers populares para testes.

**Endpoint:**
```
GET /tickers
```

**Resposta (200):**
```json
{
  "popular": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc."
    },
    {
      "symbol": "MSFT",
      "name": "Microsoft Corporation"
    },
    {
      "symbol": "TSLA",
      "name": "Tesla Inc."
    },
    {
      "symbol": "GOOGL",
      "name": "Alphabet Inc."
    },
    {
      "symbol": "AMZN",
      "name": "Amazon.com Inc."
    }
  ]
}
```

**Exemplo cURL:**
```bash
curl http://localhost:8000/tickers
```

---

## Tipos de Dados

### AnalysisResponse

```typescript
interface AnalysisResponse {
  ticker: string;                    // Símbolo da ação
  company_name: string;              // Nome da empresa
  current_price: string;             // Preço atual (ex: "$180.75")
  price_change_percent: string;      // Variação percentual (ex: "+2.45%")
  recommendation: "COMPRAR" | "VENDER" | "ESPERAR";
  confidence: number;                // Confiança 0-100
  reasoning: string;                 // Explicação da recomendação
  risks: string[];                   // Lista de riscos
  opportunities: string[];           // Lista de oportunidades
  key_metrics: KeyMetrics;           // Métricas financeiras
  news_summary: NewsSummary[];       // Resumo de notícias
  analysis_date: string;             // Data ISO da análise
}
```

### KeyMetrics

```typescript
interface KeyMetrics {
  pe_ratio: string;              // Price-to-Earnings
  dividend_yield: string;        // Dividend Yield
  market_cap: string;            // Capitalização de Mercado
  week_52_high: string;          // Máxima de 52 semanas
  week_52_low: string;           // Mínima de 52 semanas
  avg_volume: string;            // Volume médio
  rsi: string;                   // Relative Strength Index
  ma_20: string;                 // Média Móvel 20 dias
  ma_50: string;                 // Média Móvel 50 dias
}
```

### NewsSummary

```typescript
interface NewsSummary {
  title: string;                 // Título da notícia
  sentiment: "positivo" | "negativo" | "neutro";  // Sentimento
  summary: string;               // Resumo da notícia
}
```

---

## Recomendações

### COMPRAR

**Quando aparece:**
- RSI > 60 ou < 40 (extremos)
- Preço acima da MM50
- Sentimento positivo

**Significado:** Ação tem bom potencial de ganho

### VENDER

**Quando aparece:**
- RSI muito elevado (> 70)
- Muitos riscos identificados
- Sentimento negativo

**Significado:** Ação pode ter risco elevado

### ESPERAR

**Quando aparece:**
- Dados insuficientes
- Sinais mistos
- Incerteza no mercado

**Significado:** Melhor aguardar mais sinais antes de investir

---

## Tratamento de Erros

### Erros Comuns

#### Ticker Inválido
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": ""}'
```

**Response (400):**
```json
{
  "detail": "Ticker não pode estar vazio"
}
```

#### API Key Inválida (Backend)
**Response (500):**
```json
{
  "detail": "Erro ao analisar ação: Invalid API key provided"
}
```

#### Ticker Não Encontrado
**Response (500):**
```json
{
  "detail": "Erro ao analisar ação: INVALID ticker symbol not found"
}
```

---

## Rate Limiting

Não há rate limiting implementado atualmente, mas considere:

- **yfinance**: Limite de requisições por hora
- **OpenAI API**: Rate limits variam por plano
- **Browser**: CORS pode bloquear requisições

**Melhorias futuras:**
- Implementar Redis para cache
- Adicionar rate limiting por IP
- Implementar backup de dados

---

## CORS

A API tem CORS habilitado para aceitar requisições de qualquer origem:

```python
# backend/main.py
CORSMiddleware(
    allow_origins=["*"],  # Produção: especificar domínios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Para Produção:**
```python
allow_origins=[
    "https://eibolsa.com",
    "https://app.eibolsa.com"
],
```

---

## Autenticação

Autenticação não é implementada atualmente.

**Implementação Futura:**
- Bearer Token (JWT)
- API Key
- OAuth 2.0

---

## Versionamento

API versão: **1.0.0**

Sem versionamento de rota atualmente.

**Futura estrutura:**
```
/v1/analyze
/v2/analyze
```

---

## Documentação Interativa

Acesse a documentação interativa em:

```
http://localhost:8000/docs
```

Powered by Swagger UI

---

## Performance

### Tempos Típicos

| Operação | Tempo |
|----------|-------|
| Health Check | < 100ms |
| yfinance Data | 1-3s |
| LLM Analysis | 2-5s |
| Total /analyze | 4-8s |

---

## Webhooks

Não implementado atualmente.

**Futura funcionalidade:**
- Notificação quando recomendação muda
- Alerts de preço

---

## Changelog

### v1.0.0 (Inicial)
- Endpoints: /health, /analyze, /tickers
- Análise com LangChain + GPT-4
- Indicadores técnicos (RSI, MA)
- CORS habilitado

---

## Suporte

Para problemas ou perguntas:

1. Verifique [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Consulte [README.md](./README.md)
3. Abra uma issue no GitHub

---

## Exemplos de Integração

### Frontend React

```typescript
// Usando SWR
import useSWR from 'swr';

function StockAnalyzer() {
  const { data, error, isLoading } = useSWR(
    '/analyze?ticker=AAPL',
    fetcher
  );

  if (isLoading) return <div>Analisando...</div>;
  if (error) return <div>Erro na análise</div>;
  
  return <div>{data.recommendation}</div>;
}
```

### Backend Python

```python
import requests

response = requests.post(
    'http://localhost:8000/analyze',
    json={'ticker': 'AAPL'}
)

analysis = response.json()
print(f"Recomendação: {analysis['recommendation']}")
print(f"Confiança: {analysis['confidence']}%")
```

### Node.js

```javascript
const axios = require('axios');

async function analyzeStock(ticker) {
  const { data } = await axios.post(
    'http://localhost:8000/analyze',
    { ticker }
  );
  
  console.log(data.recommendation);
}

analyzeStock('MSFT');
```

---

**Última atualização:** 2024

Para atualizações, verifique o GitHub.
