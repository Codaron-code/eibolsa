#!/bin/bash

# Script para testar a API do EiBolsa

API_URL="${1:-http://localhost:8000}"

echo "=========================================="
echo "EiBolsa - API Test Script"
echo "=========================================="
echo "API URL: $API_URL"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "GET $API_URL/health"
curl -s "$API_URL/health" | jq . 2>/dev/null || echo "FAILED"
echo ""

# Test 2: Get Popular Tickers
echo "Test 2: Get Popular Tickers"
echo "GET $API_URL/tickers"
curl -s "$API_URL/tickers" | jq . 2>/dev/null || echo "FAILED"
echo ""

# Test 3: Analyze Stock
echo "Test 3: Analyze Stock (AAPL)"
echo "POST $API_URL/analyze"
curl -s -X POST "$API_URL/analyze" \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL"}' | jq . 2>/dev/null || echo "FAILED"
echo ""

# Test 4: Invalid Ticker
echo "Test 4: Invalid Ticker (INVALID)"
echo "POST $API_URL/analyze"
curl -s -X POST "$API_URL/analyze" \
  -H "Content-Type: application/json" \
  -d '{"ticker": "INVALID"}' | jq . 2>/dev/null || echo "FAILED"
echo ""

echo "=========================================="
echo "Tests Complete!"
echo "=========================================="
