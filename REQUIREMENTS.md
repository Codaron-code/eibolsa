# Requisitos do Sistema - EiBolsa

Guia completo de dependências e configuração inicial.

## Requisitos do Sistema

### Mínimo Recomendado

| Componente | Versão Mínima | Versão Recomendada |
|-----------|--------------|------------------|
| Node.js | 16.x | 18.x ou 20.x |
| Python | 3.8 | 3.11 ou 3.12 |
| Docker | 20.10 | 24.0+ |
| Docker Compose | 1.29 | 2.0+ |
| npm | 7.x | 10.x |

### Hardware Recomendado

```
CPU: 2+ cores
RAM: 4GB mínimo (8GB recomendado)
Disco: 5GB espaço livre
Internet: Conexão estável (yfinance e OpenAI)
```

---

## Instalação do Node.js

### macOS
```bash
# Usando Homebrew
brew install node@20

# Ou
curl https://nodejs.org/en/download/package-manager/

# Verificar instalação
node --version
npm --version
```

### Linux (Ubuntu/Debian)
```bash
# Método 1: NodeSource Repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Método 2: Snap
sudo snap install node --classic

# Verificar
node --version
```

### Windows
1. Download em https://nodejs.org/
2. Executar instalador
3. Seguir instruções (incluir npm)
4. Verificar em PowerShell: `node --version`

---

## Instalação do Python

### macOS
```bash
# Usando Homebrew
brew install python@3.11

# Ou download direto
# https://www.python.org/downloads/

# Verificar
python3 --version
```

### Linux (Ubuntu/Debian)
```bash
# Update sistema
sudo apt update
sudo apt upgrade

# Instalar Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Criar alias para python
sudo update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1

# Verificar
python --version
```

### Windows
1. Download em https://www.python.org/downloads/
2. **Importante**: Marcar "Add Python to PATH"
3. Executar instalador
4. Verificar em PowerShell: `python --version`

---

## Instalação do Docker e Docker Compose

### macOS
```bash
# Instalar Docker Desktop (inclui Docker Compose)
# https://www.docker.com/products/docker-desktop

# Ou via Homebrew
brew install --cask docker

# Iniciar Docker Desktop
open -a Docker

# Verificar
docker --version
docker-compose --version
```

### Linux (Ubuntu/Debian)
```bash
# Remover versões antigas
sudo apt-get remove docker docker-engine docker.io containerd runc

# Setup do repositório
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Adicionar chave GPG Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker-archive-keyring.gpg

# Adicionar repositório
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Instalar Docker Compose v2
sudo apt-get install -y docker-compose

# Permitir sem sudo (opcional)
sudo usermod -aG docker $USER
newgrp docker

# Verificar
docker --version
docker-compose --version
```

### Windows
```powershell
# Usar Chocolatey (se instalado)
choco install docker-desktop

# Ou download direto
# https://www.docker.com/products/docker-desktop

# Verificar (abrir PowerShell depois de instalar)
docker --version
docker-compose --version
```

---

## Dependências Node.js (Frontend)

Já está no `package.json`, mas aqui estão as principais:

### Dependências Principais
```json
{
  "next": "16.1.6",           // Framework React
  "react": "19.2.4",          // Biblioteca UI
  "tailwindcss": "^4.2.0",    // CSS Utility
  "swr": "^2.2.4",            // Data Fetching
  "lucide-react": "^0.564.0", // Ícones
  "@radix-ui/*": "latest",    // Componentes UI
  "zod": "^3.24.1"            // Validação
}
```

### Instalação
```bash
npm install
```

---

## Dependências Python (Backend)

Estão em `backend/requirements.txt`:

### Dependências Principais
```
fastapi==0.104.1              # Framework Web
uvicorn==0.24.0               # ASGI Server
pydantic==2.5.0               # Validação
yfinance==0.2.32              # Dados de Ações
pandas==2.1.3                 # Análise de Dados
langchain==0.1.0              # Framework IA
langchain-openai==0.0.5       # Integração OpenAI
python-dotenv==1.0.0          # Variáveis de Ambiente
```

### Instalação
```bash
cd backend
pip install -r requirements.txt
```

---

## Chave de API OpenAI

### Como Obter

1. Ir para https://platform.openai.com/api-keys
2. Fazer login (criar conta se necessário)
3. Clicar "Create new secret key"
4. Copiar a chave (você só vê uma vez!)
5. Colar em `backend/.env`:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

### Verificar Créditos

1. Ir para https://platform.openai.com/account/usage/overview
2. Verificar créditos disponíveis
3. Considerar upgrade se necessário

### Modelos Disponíveis

| Modelo | Custo | Velocidade | Qualidade |
|--------|-------|-----------|-----------|
| gpt-3.5-turbo | $ | ⚡⚡⚡ | ⭐⭐⭐ |
| gpt-4-turbo | $$$ | ⚡⚡ | ⭐⭐⭐⭐⭐ |
| gpt-4 | $$$$ | ⚡ | ⭐⭐⭐⭐⭐ |

**Recomendação:** Usar `gpt-3.5-turbo` para desenvolvimento (mais barato)

---

## Verificação de Instalação

### Script de Verificação

```bash
#!/bin/bash

echo "Verificando dependências..."

# Node.js
node --version || echo "❌ Node.js não instalado"
npm --version || echo "❌ npm não instalado"

# Python
python --version || echo "❌ Python não instalado"
pip --version || echo "❌ pip não instalado"

# Docker
docker --version || echo "❌ Docker não instalado"
docker-compose --version || echo "❌ Docker Compose não instalado"

echo "Verificação concluída!"
```

### Executar Verificação
```bash
bash verify-installation.sh
```

---

## Variáveis de Ambiente

### Backend (.env)

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-your-api-key

# Python Configuration
PYTHONUNBUFFERED=1

# Optional: Logging Level
LOG_LEVEL=INFO
```

### Frontend (.env ou .env.local)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Build Configuration
NEXT_PUBLIC_APP_NAME=EiBolsa
```

### Docker Compose (.env)

```env
# Will use backend/.env
# Frontend uses docker-compose.yml environment section
```

---

## Otimizações Opcionais

### Python
```bash
# Usar ambiente virtual separado por projeto
python3 -m venv venv-eibola
source venv-eibola/bin/activate

# Ou usar pyenv para múltiplas versões
curl https://pyenv.run | bash
pyenv install 3.11.0
pyenv local 3.11.0
```

### Node.js
```bash
# Usar nvm para múltiplas versões
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Aumentar limite de arquivo aberto (macOS/Linux)
ulimit -n 65535
```

### Docker
```bash
# Aumentar recursos (macOS)
# Docker Desktop > Preferences > Resources
# Recomendado: 4+ CPU cores, 8GB RAM

# Linux: Usar daemon.json
echo '{
  "storage-driver": "overlay2",
  "log-driver": "json-file"
}' | sudo tee /etc/docker/daemon.json

sudo systemctl restart docker
```

---

## Troubleshooting de Instalação

### Node.js não encontrado
```bash
# macOS
export PATH="/usr/local/opt/node@20/bin:$PATH"
echo 'export PATH="/usr/local/opt/node@20/bin:$PATH"' >> ~/.zshrc

# Linux: Adicionar ao .bashrc
export PATH="$PATH:$HOME/.nvm/versions/node/v20/bin"
```

### Python não encontrado
```bash
# Usar python3 explicitamente
python3 --version
python3 -m venv venv

# Ou criar alias
alias python=python3
echo "alias python=python3" >> ~/.bashrc
```

### Docker permissão negada (Linux)
```bash
sudo usermod -aG docker $USER
newgrp docker

# Logout e login para aplicar
```

---

## Próximas Etapas

1. ✅ Instalar todas as dependências
2. ✅ Configurar variáveis de ambiente
3. ✅ Verificar instalação
4. → Seguir [QUICKSTART.md](./QUICKSTART.md)

---

## Versões Testadas

Este projeto foi testado com:

```
Node.js 20.x
Python 3.11.x
Docker 24.x
Docker Compose 2.x
npm 10.x
```

---

## Suporte Oficial

- Node.js: https://nodejs.org/
- Python: https://www.python.org/
- Docker: https://www.docker.com/
- npm: https://www.npmjs.com/

## Comunidade

- Stack Overflow: #nodejs #python #docker
- GitHub Discussions
- Community Forums

---

**Pronto para começar? Vá para [QUICKSTART.md](./QUICKSTART.md)**
