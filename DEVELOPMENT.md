# Guia de Desenvolvimento - EiBolsa

## Estrutura do Projeto

```
.
├── app/                      # Aplicação Next.js
│   ├── layout.tsx           # Layout raiz
│   ├── page.tsx             # Página principal
│   └── globals.css          # Estilos globais
│
├── backend/                 # API FastAPI em Python
│   ├── main.py              # Aplicação FastAPI
│   ├── models.py            # Schemas Pydantic
│   ├── stock_analyzer.py    # Lógica de análise
│   ├── requirements.txt      # Dependências Python
│   ├── Dockerfile           # Containerização
│   └── .env.example         # Variáveis de ambiente
│
├── components/              # Componentes React
│   ├── stock-analysis.tsx   # Componente principal
│   └── ui/                  # Componentes UI (shadcn)
│
├── lib/                     # Utilitários
│   ├── api-client.ts        # Cliente API
│   └── utils.ts             # Funções auxiliares
│
├── public/                  # Arquivos estáticos
├── docker-compose.yml       # Orquestração de containers
├── Dockerfile.frontend      # Dockerfile do frontend
└── README.md               # Documentação
```

## Configuração do Ambiente

### Variáveis de Ambiente

#### Backend (backend/.env)
```
OPENAI_API_KEY=sk-proj-xxx...
PYTHONUNBUFFERED=1
```

#### Frontend (root .env)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Desenvolvimento Local

### Backend

#### Instalação
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Executar
```bash
export OPENAI_API_KEY=your_key_here
uvicorn main:app --reload
```

O servidor estará em `http://localhost:8000`

#### API Documentation
Acesse `http://localhost:8000/docs` para Swagger UI

### Frontend

#### Instalação
```bash
npm install
```

#### Executar
```bash
export NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

O site estará em `http://localhost:3000`

## Com Docker Compose

### Build e Start
```bash
# Criar arquivo .env com OpenAI API Key
cp .env.example .env
# Editar .env e adicionar OPENAI_API_KEY

# Build e iniciar
docker-compose up --build

# Em modo detached (background)
docker-compose up -d --build
```

### Acessar Logs
```bash
# Todos os serviços
docker-compose logs -f

# Apenas backend
docker-compose logs -f backend

# Apenas frontend
docker-compose logs -f frontend
```

### Parar Serviços
```bash
docker-compose down
```

### Reconstruir (sem cache)
```bash
docker-compose build --no-cache
docker-compose up
```

## Fluxo de Desenvolvimento

### 1. Adicionar Feature no Backend

1. Editar `backend/models.py` para novos schemas
2. Implementar lógica em `backend/stock_analyzer.py`
3. Adicionar endpoint em `backend/main.py`
4. Testar com `curl` ou Swagger UI (`/docs`)

### 2. Adicionar Feature no Frontend

1. Criar novo componente em `components/`
2. Usar `apiClient` para chamar API
3. Testar localmente com `npm run dev`
4. Verificar responsividade

### 3. Adicionar Dependências

#### Backend
```bash
cd backend
pip install new-package
pip freeze > requirements.txt
```

#### Frontend
```bash
npm install new-package
```

## Debugging

### Backend
```bash
# Ativar logs detalhados
export LOG_LEVEL=DEBUG
uvicorn main:app --reload

# Usar debugger
import pdb; pdb.set_trace()
```

### Frontend
```bash
# Console do navegador (F12)
console.log("[v0] Debug message:", variable)

# React DevTools Chrome Extension
# Recomendado para debug de componentes
```

## Testes

### Backend
```bash
# (Adicionar testes com pytest no futuro)
```

### Frontend
```bash
# (Adicionar testes com Jest/Vitest no futuro)
```

## Performance

### Backend
- Dados são buscados em tempo real (sem cache)
- Considerar adicionar Redis para cache em produção
- yfinance pode ser lento - considerar alternativas para grande volume

### Frontend
- SWR implementa cache automático
- Tailwind CSS é otimizado
- Next.js faz otimizações automáticas
- Lazy loading de imagens

## Deploy

### Vercel (Frontend)
```bash
# Conectar repositório GitHub
# Vercel detecta Next.js automaticamente
# Adicionar variável NEXT_PUBLIC_API_URL nas settings
```

### Railway/Render (Backend)
```bash
# Conectar repositório GitHub
# Especificar work directory: backend
# Adicionar variável OPENAI_API_KEY
# Comando: uvicorn main:app --host 0.0.0.0
```

## Troubleshooting

### Backend não conecta ao OpenAI
- Verificar se OPENAI_API_KEY está correto
- Verificar quota na OpenAI
- Verificar internet connection

### Frontend não conecta ao Backend
- Verificar se NEXT_PUBLIC_API_URL está correto
- Verificar CORS no backend
- Verificar se backend está rodando

### Docker issues
```bash
# Limpar containers e imagens
docker-compose down -v
docker system prune -a

# Reconstruir do zero
docker-compose build --no-cache
```

## Próximos Passos

1. Adicionar autenticação de usuário
2. Implementar banco de dados (PostgreSQL/Supabase)
3. Adicionar gráficos interativos
4. Implementar cache com Redis
5. Adicionar testes automatizados
6. Setup CI/CD com GitHub Actions
7. Adicionar mais indicadores técnicos
8. Integração com mais APIs de notícias

## Recursos Úteis

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [LangChain Documentation](https://python.langchain.com/)
- [yfinance Documentation](https://github.com/ranaroussi/yfinance)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Contato/Suporte

Para dúvidas ou issues, abra um issue no repositório.

---

Happy Coding! 🚀
