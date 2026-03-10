# EiBolsa - Análise Inteligente de Ações

Uma plataforma fullstack de análise de ações que utiliza inteligência artificial para gerar recomendações de investimento baseadas em dados financeiros reais.

## Tecnologias Utilizadas

### Backend
- **FastAPI**: Framework web rápido e moderno para Python
- **yfinance**: Biblioteca para buscar dados de ações em tempo real
- **pandas**: Processamento e análise de dados financeiros
- **LangChain + OpenAI GPT-4**: IA para análise e recomendações
- **Pydantic**: Validação de dados e schemas
- **Docker**: Containerização

### Frontend
- **Next.js 16**: Framework React com renderização server-side
- **React 19**: Biblioteca para construção de interfaces
- **Tailwind CSS**: Framework CSS utilitário
- **shadcn/ui**: Componentes de UI acessíveis
- **SWR**: Biblioteca para data fetching e caching

## Arquitetura

```
Cliente (Next.js/React) → FastAPI Backend (Python)
                              ↓
                    yfinance + pandas (Dados)
                              ↓
                    LangChain + GPT-4 (IA)
                              ↓
                    JSON Response → Cliente
```

## Configuração e Instalação

### Pré-requisitos
- Docker e Docker Compose
- Node.js 18+
- Python 3.11+
- OpenAI API Key

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Backend
OPENAI_API_KEY=your_openai_api_key_here

# Frontend (Docker Compose)
NEXT_PUBLIC_API_URL=http://backend:8000
```

### Com Docker Compose

```bash
docker-compose up --build
```

O frontend estará disponível em `http://localhost:3000`
O backend estará disponível em `http://localhost:8000`

### Desenvolvimento Local

#### Backend

```bash
cd backend
pip install -r requirements.txt
export OPENAI_API_KEY=your_key_here
uvicorn main:app --reload
```

#### Frontend

```bash
npm install
export NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

## Funcionalidades

### Análise de Ações
- Busca dados reais de ações usando yfinance
- Calcula indicadores técnicos (RSI, Médias Móveis)
- Utiliza IA para gerar recomendações inteligentes

### Recomendações
- **COMPRAR**: Ação com bom potencial de ganho
- **VENDER**: Ação com riscos elevados
- **ESPERAR**: Melhor aguardar mais sinais

### Métricas Exibidas
- Preço atual e variação percentual
- P/L (Price-to-Earnings)
- Dividend Yield
- Market Cap
- 52-Week High/Low
- RSI e Médias Móveis
- Volume médio
- Análise de sentimento de notícias

## API Endpoints

### Analisar Ação
```bash
POST /analyze
Content-Type: application/json

{
  "ticker": "AAPL"
}
```

**Response:**
```json
{
  "ticker": "AAPL",
  "company_name": "Apple Inc.",
  "current_price": "$180.75",
  "price_change_percent": "+2.45%",
  "recommendation": "COMPRAR",
  "confidence": 85,
  "reasoning": "A ação mostra sinais positivos...",
  "risks": ["Volatilidade do setor", "..."],
  "opportunities": ["Crescimento esperado", "..."],
  "key_metrics": { ... },
  "news_summary": [ ... ],
  "analysis_date": "2024-01-15T10:30:00"
}
```

### Health Check
```bash
GET /health
```

### Exemplos de Tickers
```bash
GET /tickers
```

## Design

### Tema Escuro com Glassmorphism
- Interface elegante e moderna
- Efeitos de vidro translúcido (glassmorphism)
- Cores: Azul (primário), Verde (compra), Vermelho (venda), Amarelo (espera)
- Totalmente responsivo (mobile-first)

## Fluxo de Dados

1. Usuário digita um ticker na interface
2. Frontend envia POST request para `/analyze`
3. Backend busca dados com yfinance
4. pandas processa indicadores técnicos
5. LangChain + GPT-4 gera análise e recomendação
6. Resposta é enviada para o frontend
7. Interface exibe análise com detalhes visuais

## Tratamento de Erros

- Validação de tickers
- Tratamento de erros de API
- Fallbacks quando dados estão indisponíveis
- Mensagens de erro amigáveis para o usuário

## Performance

- SWR para caching inteligente no frontend
- Componentes otimizados com React 19
- Tailwind CSS para estilos eficientes
- Next.js com otimizações automáticas

## Segurança

- CORS habilitado
- Validação de entrada com Pydantic
- Variáveis de ambiente protegidas
- Containers isolados com Docker

## Desenvolvimento Futuro

- Múltiplas moedas/mercados
- Histórico de análises
- Comparação entre ações
- Alertas de preço
- Gráficos interativos
- Autenticação de usuário
- Banco de dados persistente

## Contribuição

Contribuições são bem-vindas! Por favor:

1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

MIT License - veja LICENSE para detalhes

## Contato

Para dúvidas ou sugestões, abra uma issue no repositório.

---

**Desenvolvido com ❤️ usando v0**
