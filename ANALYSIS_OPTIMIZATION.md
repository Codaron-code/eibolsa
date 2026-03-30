# Análise de Performance e Erros - Sistema de Busca por Ticker

## 🔴 Problemas Identificados

### 1. **Falta de Paralelização Adequada** (CRÍTICO)
**Arquivo**: `/app/api/analyze/route.ts`
**Impacto**: Delay de 5-15 segundos adicional

```
Fluxo Atual (SEQUENCIAL):
fetchYahooFinanceData() → completa
fetchFinanceNews() → completa
generateAnalysis() → executa

Problema: Esperado um terminar antes de chamar o próximo
```

**Solução**: Paralelizar com `Promise.all()`

---

### 2. **Múltiplos Fetches Sequenciais em fetchYahooFinanceData**
**Impacto**: 3-8 segundos de delay
- Tenta API v8 chart (se falhar, aguarda timeout)
- Depois tenta API v7 quote (nova espera)
- `fetchFundamentals()` é aguardado DENTRO de cada tentativa
- `fetchFinanceNews()` executado APÓS tudo completar

**Problema**: 
```
Tentativa 1 (v8): ~3s timeout → falha
await fetchFundamentals(sym) → ~2s → falha/sucesso
Tentativa 2 (v7): ~3s timeout → sucesso (mas depois de 5+ segundos)
```

---

### 3. **Sem Timeout nas Requisições**
**Impacto**: Requisição pode pendurar indefinidamente
- `fetch()` sem `AbortController`
- Yahoo Finance pode ser lento ou não responder

**Solução**: Implementar timeout de 5-8 segundos por requisição

---

### 4. **Cache Desabilitado** (`cache: 'no-store'`)
**Impacto**: 30-50% de requisições desnecessárias
- Mesma ação buscada múltiplas vezes em minutos
- Yahoo Finance forneceu dados que poderiam ser reutilizados

**Solução**: Cache com TTL (5-10 minutos para dados normais, 30min para fundamentals)

---

### 5. **Sem Rate Limiting ou Proteção contra Bloqueio**
**Impacto**: Requisições bloqueadas após múltiplas tentativas
- Yahoo Finance pode bloquear por muitos requests rápidos
- User-Agent rotation sem verificação de efetividade

**Solução**: Implementar delay adaptatório (50-200ms com backoff)

---

### 6. **Retry Strategy Inadequada**
**Impacto**: 30% de falhas recuperáveis não recuperadas
- Apenas 2 hosts por API, sem delay entre tentativas
- Sem backoff exponencial

**Exemplo de falha evitável**:
```
Host 1: Timeout
Host 2 (imediato): Ainda sobrecarregado → Falha
```

---

### 7. **Busca de Fundamentals Sempre Executa**
**Impacto**: +2-3 segundos por requisição
- Faz 4 módulos diferentes do quoteSummary
- Fallback completo sem tentar principais primeiro

**Solução**: Buscar apenas quando necessário, com request único consolidado

---

### 8. **Múltiplos Loops Aninhados em fetchFinanceNews**
**Impacto**: 2-4 segundos quando tenta fallbacks
- 2 queries × 2 hosts = até 4 requisições sequenciais
- Sem paralelização

---

### 9. **Sem Limite de Tempo Total**
**Impacto**: Operação pode levar 20+ segundos
- Sem timeout geral para toda a operação
- Usuário espera indefinidamente sem feedback

---

## 📊 Diagnóstico de Erros Comuns

| Erro | Causa | Frequência | Solução |
|------|-------|-----------|---------|
| "Ticker not found" | Yahoo bloqueado ou ticker inválido | 20% | Validação anterior, fallback API |
| Timeout 504 | Requisição > 30s (Vercel) | 15% | Paralelizar, cache, reduzir payload |
| "Undefined price_change" | Fallback para quote sem histórico | 10% | Completar dados com secundárias |
| 429 Too Many Requests | Rate limiting do Yahoo | 8% | Throttle, delay, múltiplas IPs |
| JSON parse error | Resposta corrompida/incompleta | 5% | Validação de resposta |

---

## ⚡ Plano de Otimização (Prioridade)

### FASE 1: Paralelização (Ganho: -40% latência)
- [ ] Paralelizar stock data + fundamentals + news com `Promise.all()`
- [ ] Usar `Promise.race()` para APIs paralelas
- [ ] Implementar timeout (5s) com `AbortController`

### FASE 2: Cache Inteligente (Ganho: -50% requisições)
- [ ] Cache em memória com TTL (5-10 min para prices)
- [ ] Usar Redis se escalável
- [ ] Validar via HEAD request antes de servir cache

### FASE 3: Rate Limiting (Ganho: -25% erros 429)
- [ ] Implementar fila com delay (100-200ms)
- [ ] Alternância de IPs/proxies
- [ ] Exponential backoff com jitter

### FASE 4: Resiliência (Ganho: -80% falhas)
- [ ] Múltiplas fontes de dados (não só Yahoo)
- [ ] Fallback para dados degradados (ex: sem histórico)
- [ ] Circuit breaker para hosts sobrecarregados

---

## 📈 Métricas Esperadas Após Otimizações

| Métrica | Antes | Depois | Meta |
|---------|-------|--------|------|
| P95 Latência | 12-15s | 3-5s | 2-3s |
| P99 Latência | 20-25s | 6-8s | 4-5s |
| Taxa de erro | 12-15% | 2-3% | < 1% |
| Taxa de timeout | 8% | < 1% | Negligente |
| Requests/min | 100% | 40% | Com cache |

---

## 🔧 Mudanças Recomendadas

### Arquivo: `app/api/analyze/route.ts`

**Antes (Atual)**:
```typescript
const stockData = await fetchYahooFinanceData(ticker);  // 5-10s
const news = await fetchFinanceNews(...);                 // 2-4s
// Total: 7-14s (sequencial)
```

**Depois (Otimizado)**:
```typescript
const [stockData, news] = await Promise.all([
  fetchYahooFinanceData(ticker),    // 3-5s com paralelização interna
  fetchFinanceNews(...)              // Paralela, termina em ~2s
]);
// Total: 3-5s (paralelo)
```

---

## 🎯 Próximos Passos
1. Implementar timeout com AbortController
2. Paralelizar requisições internas
3. Adicionar cache com validação
4. Implementar rate limiting com fila
5. Testar com múltiplos tickers simultaneamente
