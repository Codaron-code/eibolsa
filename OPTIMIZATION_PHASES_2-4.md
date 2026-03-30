# 🔮 Roteiro Completo de Otimizações (Fases 2-4)

---

## Fase 2: Cache Inteligente (Estimado: -50% requisições)

### Objetivo
Reduzir requisições ao Yahoo Finance com cache de 5-10 minutos

### Implementação Sugerida

**Arquivo**: `lib/cache.ts` (novo)

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hitCount: number;
}

class StockDataCache {
  private cache = new Map<string, CacheEntry<StockData>>();
  private readonly maxSize = 100;
  private readonly ttl = {
    prices: 5 * 60 * 1000,        // 5 min (preços mudam rápido)
    fundamentals: 30 * 60 * 1000, // 30 min (fundamentals estáveis)
  };

  set(ticker: string, data: StockData, type: 'price' | 'fundamental' = 'price') {
    // Limpar se atingir limite
    if (this.cache.size >= this.maxSize) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      this.cache.delete(oldest[0]);
    }

    this.cache.set(ticker, {
      data,
      timestamp: Date.now(),
      hitCount: 0,
    });
  }

  get(ticker: string, type: 'price' | 'fundamental' = 'price'): StockData | null {
    const entry = this.cache.get(ticker);
    if (!entry) return null;

    const ttl = type === 'price' ? this.ttl.prices : this.ttl.fundamentals;
    const isExpired = Date.now() - entry.timestamp > ttl;

    if (isExpired) {
      this.cache.delete(ticker);
      return null;
    }

    entry.hitCount++;
    return entry.data;
  }

  // Validar se cache ainda é válido (HEAD request rápido)
  async validate(ticker: string): Promise<boolean> {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`,
        { method: 'HEAD', timeout: 2000 }
      );
      // Se o preço mudou muito, invalidar
      return res.ok;
    } catch {
      return false; // Não conseguiu validar, servir do cache
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([ticker, entry]) => ({
        ticker,
        hitCount: entry.hitCount,
        age: Date.now() - entry.timestamp,
      })),
    };
  }
}

export const stockCache = new StockDataCache();
```

### Impacto Esperado
- **Cache hit rate**: 60-70% (usuários buscam tickers repetidos)
- **Latência com cache**: < 100ms
- **Redução de requisições**: -50%
- **Redução de banda**: -40%

### Métricas para Monitorar
- Hit/miss rate
- Tamanho do cache (bytes)
- TTL efetivo
- Invalidação de cache

---

## Fase 3: Rate Limiting com Fila (Estimado: -25% erros 429)

### Objetivo
Implementar fila de requisições com delay adaptatório

### Implementação Sugerida

**Arquivo**: `lib/rate-limiter.ts` (novo)

```typescript
class RateLimiter {
  private queue: Array<() => Promise<unknown>> = [];
  private isProcessing = false;
  private requestCount = 0;
  private lastResetTime = Date.now();
  private failureCount = 0;
  
  // Config adaptatória
  private delayMs = 100;  // Começa com 100ms
  private maxRequestsPerMinute = 30;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          this.failureCount = Math.max(0, this.failureCount - 1);
          resolve(result);
        } catch (error) {
          this.failureCount++;
          // Exponential backoff
          this.delayMs = Math.min(2000, this.delayMs * 1.5);
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Reset de contagem a cada minuto
      const now = Date.now();
      if (now - this.lastResetTime > 60000) {
        this.requestCount = 0;
        this.lastResetTime = now;
      }

      // Verificar limite
      if (this.requestCount >= this.maxRequestsPerMinute) {
        const waitTime = 60000 - (now - this.lastResetTime);
        console.log(`Rate limit atingido. Aguardando ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      const fn = this.queue.shift()!;
      await fn();
      this.requestCount++;

      // Aguardar delay antes da próxima
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }

    this.isProcessing = false;
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      requestsPerMinute: this.requestCount,
      currentDelayMs: this.delayMs,
      failureCount: this.failureCount,
    };
  }
}

export const rateLimiter = new RateLimiter();
```

### Uso em `route.ts`

```typescript
const stockData = await rateLimiter.execute(() => 
  fetchYahooFinanceData(ticker)
);
```

### Impacto Esperado
- **Taxa de erro 429**: -25%
- **Bloqueios de IP**: -80%
- **Requisições recuperadas**: +15%

---

## Fase 4: Resiliência com Fallbacks (Estimado: -80% falhas)

### Objetivo
Implementar fallbacks e dados degradados

### Implementação Sugerida

**Arquivo**: `lib/fallback-strategies.ts` (novo)

```typescript
// Tentar múltiplas fontes
async function fetchStockDataResilient(ticker: string): Promise<StockData> {
  const strategies = [
    () => fetchYahooFinanceData(ticker),      // Principal
    () => fetchAlternativeAPI(ticker),        // Fallback 1
    () => fetchDegradedData(ticker),          // Fallback 2 (dados parciais)
  ];

  for (const strategy of strategies) {
    try {
      return await Promise.race([
        strategy(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        )
      ]);
    } catch (error) {
      console.log(`Strategy falhou: ${error.message}`);
      continue;
    }
  }

  throw new Error('Todas as estratégias falharam');
}

// Dados degradados (sem histórico)
async function fetchDegradedData(ticker: string): Promise<StockData> {
  try {
    const res = await fetchWithTimeout(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`,
      3000 // Timeout menor para fallback
    );
    const json = await res.json();
    const q = json.quoteResponse?.result?.[0];
    
    if (!q) throw new Error('Quote not found');

    // Retornar dados degradados
    return buildStockDataFromQuote(ticker, q, {
      price: {},
      summaryDetail: {},
      keyStatistics: {},
      financialData: {},
    });
  } catch (error) {
    throw new Error(`Degraded data failed: ${error.message}`);
  }
}

// Circuit breaker por host
class CircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailureTime = new Map<string, number>();
  private failureThreshold = 5;
  private resetTimeMs = 60000; // 1 minuto

  isOpen(host: string): boolean {
    const failures = this.failures.get(host) || 0;
    const lastFailure = this.lastFailureTime.get(host) || 0;
    
    // Reset se passou tempo
    if (Date.now() - lastFailure > this.resetTimeMs) {
      this.failures.delete(host);
      return false;
    }

    return failures >= this.failureThreshold;
  }

  recordFailure(host: string) {
    this.failures.set(host, (this.failures.get(host) || 0) + 1);
    this.lastFailureTime.set(host, Date.now());
  }

  recordSuccess(host: string) {
    this.failures.delete(host);
  }
}

export const circuitBreaker = new CircuitBreaker();
```

### Impacto Esperado
- **Taxa de erro geral**: -80%
- **Disponibilidade**: 99.5%+
- **Usuários afetados por outage**: < 5%

---

## 📊 Resumo de Ganhos Cumulativos

| Fase | Latência P95 | Taxa Erro | Melhoria | Implementação |
|------|--------------|-----------|----------|---------------|
| Baseline | 12-15s | 12-15% | — | — |
| Fase 1 ✅ | 4-5s | 10-12% | -65% | Timeout + Paralelo |
| Fase 2 | 2-3s | 8-10% | -85% | +Cache |
| Fase 3 | 2-3s | 3-5% | -95% | +Rate Limit |
| Fase 4 | 2-3s | < 1% | -99% | +Fallbacks |

---

## 🛠️ Priorização

**Recomendado fazer nesta ordem:**

1. ✅ **Fase 1** (CONCLUÍDA) - Máximo impacto, mínima complexidade
2. **Fase 2** (PRÓXIMA) - Cache é essencial para produção
3. **Fase 3** (IMPORTANTE) - Proteção contra throttling
4. **Fase 4** (NICE-TO-HAVE) - Confiabilidade extrema

**Tempo estimado:**
- Fase 2: 2-3 horas
- Fase 3: 2-3 horas
- Fase 4: 3-4 horas

---

## 📌 Checklist Implementação

### Fase 2 - Cache
- [ ] Criar `lib/cache.ts`
- [ ] Integrar em `route.ts`
- [ ] Testes de TTL
- [ ] Métricas de hit rate
- [ ] Documentar limites de memória

### Fase 3 - Rate Limiting
- [ ] Criar `lib/rate-limiter.ts`
- [ ] Integrar fila em `route.ts`
- [ ] Backoff exponencial
- [ ] Testes de throttling
- [ ] Monitorar delays

### Fase 4 - Resiliência
- [ ] Criar fallback strategies
- [ ] Implementar circuit breaker
- [ ] Testar todos os cenários
- [ ] Documentar comportamento degradado
- [ ] Alertas de fallback

---

## 🧪 Testes Sugeridos

```bash
# Teste de carga (Phase 2+)
Artillery:
- 10 RPS durante 5 minutos
- Validar cache hit rate

# Teste de rate limiting (Phase 3)
- Simular 100 requisições em 1 segundo
- Verificar fila

# Teste de resiliência (Phase 4)
- Bloquear Yahoo Finance
- Verificar fallback automático
```

---

## 🎯 Sucesso Definido

✅ Fase 1: P95 < 5s  
✅ Fase 2: P95 < 3s + 60%+ cache hit  
✅ Fase 3: 429 errors < 2%  
✅ Fase 4: Downtime resilience < 1%  

**Meta Final**: Latência P95 < 3s, Taxa erro < 1%, 99.5%+ uptime
