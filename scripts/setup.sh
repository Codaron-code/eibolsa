#!/bin/bash

# Script de configuração e inicialização do EiBolsa

set -e

echo "=========================================="
echo "EiBolsa - Setup Script"
echo "=========================================="
echo ""

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "Criando arquivo .env..."
    cp .env.example .env
    echo "AVISO: Edite o arquivo .env e adicione sua OpenAI API Key"
else
    echo ".env já existe"
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "ERRO: Docker não está instalado"
    exit 1
fi

echo "Docker encontrado"

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "ERRO: Docker Compose não está instalado"
    exit 1
fi

echo "Docker Compose encontrado"
echo ""

# Build e start
echo "Construindo imagens Docker..."
docker-compose build

echo ""
echo "Iniciando serviços..."
docker-compose up

echo ""
echo "=========================================="
echo "EiBolsa está rodando!"
echo "=========================================="
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo "=========================================="
