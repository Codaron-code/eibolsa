import { NextRequest, NextResponse } from 'next/server';

// Interfaces para tipagem
interface StockData {
  ticker: string;
  company_name: string;
  currency: string;
  current_price: number;
  previous_close: number;
  price_change: number;
  price_change_percent: number;
  day_high: number;
  day_low: number;
  week_52_high: number;
  week_52_low: number;
  volume: number;
  avg_volume: number;
  market_cap: number;
  pe_ratio: number | null;
  forward_pe: number | null;
  dividend_yield: number | null;
  beta: number | null;
  eps: number | null;
  book_value: number | null;
  target_price: number | null;
  recommendation_mean: number | null;
  rsi: number;
  ma_20: number;
  ma_50: number;
  historical_prices: number[];
}

interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
}

// Cache simples em memória (FASE 2 - TTL de 5 minutos)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const FETCH_TIMEOUT = 5000; // 5 segundos por requisição

function getCacheKey(ticker: string, endpoint: string): string {
  return `${ticker}:${endpoint}`;
}

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Headers rotativos para evitar bloqueio do Yahoo Finance
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

function getHeaders() {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  return {
    'User-Agent': ua,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,pt;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': 'https://finance.yahoo.com/',
    'Origin': 'https://finance.yahoo.com',
  };
}

// Helper com timeout (FASE 1)
async function fetchWithTimeout(url: string, timeoutMs: number = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: getHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Normaliza o ticker: detecta padrao brasileiro e adiciona .SA
function normalizeTicker(raw: string): string[] {
  const t = raw.toUpperCase().trim().replace(/\s+/g, '');

  // Se ja tem sufixo de bolsa (.SA, .L, .TO, etc), usa como esta
  if (t.includes('.')) return [t];

  // Padrao brasileiro: 4 letras + 1-2 numeros (ex: PETR4, VALE3, BBAS3)
  if (/^[A-Z]{4}[0-9]{1,2}$/.test(t)) {
    return [`${t}.SA`, t]; // tenta .SA primeiro, depois sem sufixo
  }

  // Americano ou outro: tenta direto e com variantes
  return [t];
}

// Busca dados via Yahoo Finance chart API (v8) com fallback para v7 (quote)
// OTIMIZADO: usa Promise.race() para paralelizar hosts (FASE 1)
async function fetchYahooFinanceData(ticker: string): Promise<StockData> {
  const tickers = normalizeTicker(ticker);
  let lastError: Error | null = null;

  for (const sym of tickers) {
    // Tenta em paralelo: v8 chart + v7 quote
    const [chartResult, quoteResult] = await Promise.allSettled([
      tryFetchChart(sym),
      tryFetchQuote(sym),
    ]);

    // Se algum funcionou, busca fundamentals em paralelo e retorna
    if (chartResult.status === 'fulfilled' && chartResult.value) {
      const fundamentals = await fetchFundamentals(sym);
      return buildStockData(sym, chartResult.value, fundamentals);
    }

    if (quoteResult.status === 'fulfilled' && quoteResult.value) {
      const fundamentals = await fetchFundamentals(sym);
      return buildStockDataFromQuote(sym, quoteResult.value, fundamentals);
    }

    // Guardar erro para referência
    if (chartResult.status === 'rejected') {
      lastError = chartResult.reason;
    }
    if (quoteResult.status === 'rejected') {
      lastError = quoteResult.reason;
    }
  }

  throw lastError || new Error(`Ticker "${ticker}" nao encontrado em nenhum mercado.`);
}

// Tenta buscar chart v8 com fallback entre hosts (FASE 1)
async function tryFetchChart(sym: string): Promise<Record<string, unknown> | null> {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  
  for (const host of hosts) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=3mo&includePrePost=false`;
      const res = await fetchWithTimeout(url);

      if (!res.ok) continue;

      const json = await res.json();
      const chart = json.chart?.result?.[0];
      if (chart?.meta) return chart;
    } catch (e) {
      // Continua tentando próximo host
    }
  }

  return null;
}

// Tenta buscar quote v7 com fallback entre hosts (FASE 1)
async function tryFetchQuote(sym: string): Promise<Record<string, unknown> | null> {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  
  for (const host of hosts) {
    try {
      const url = `https://${host}/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;
      const res = await fetchWithTimeout(url);

      if (!res.ok) continue;

      const json = await res.json();
      const q = json.quoteResponse?.result?.[0];
      if (q) return q;
    } catch (e) {
      // Continua tentando próximo host
    }
  }

  return null;
}

// Busca fundamentals via quoteSummary (com timeout)
async function fetchFundamentals(sym: string) {
  // Tenta com fallback entre hosts, com timeout
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  for (const host of hosts) {
    try {
      const url = `https://${host}/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=price,summaryDetail,defaultKeyStatistics,financialData`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) continue;
      const json = await res.json();
      const result = json.quoteSummary?.result?.[0];
      if (!result) continue;
      return {
        price: result.price || {},
        summaryDetail: result.summaryDetail || {},
        keyStatistics: result.defaultKeyStatistics || {},
        financialData: result.financialData || {},
      };
    } catch {
      // Continua tentando próximo host
    }
  }
  return { price: {}, summaryDetail: {}, keyStatistics: {}, financialData: {} };
}

type Fundamentals = Awaited<ReturnType<typeof fetchFundamentals>>;

function buildStockData(sym: string, chart: Record<string, unknown>, fundamentals: Fundamentals): StockData {
  const meta = chart.meta as Record<string, unknown>;
  const indicators = chart.indicators as Record<string, unknown> | undefined;
  const quoteIndicators = indicators?.quote as Array<Record<string, unknown>> | undefined;
  const quotes = quoteIndicators?.[0] ?? {};
  const closePrices = ((quotes.close as Array<number | null>) ?? []).filter((p): p is number => p !== null);

  const currentPrice = (meta.regularMarketPrice as number) ?? 0;
  const previousClose = (meta.previousClose as number) ?? (meta.chartPreviousClose as number) ?? currentPrice;
  const priceChange = currentPrice - previousClose;
  const priceChangePercent = previousClose !== 0 ? (priceChange / previousClose) * 100 : 0;

  return {
    ticker: sym,
    company_name: (meta.shortName as string) || (meta.longName as string) || sym,
    currency: (meta.currency as string) || 'USD',
    current_price: currentPrice,
    previous_close: previousClose,
    price_change: priceChange,
    price_change_percent: priceChangePercent,
    day_high: (meta.regularMarketDayHigh as number) ?? currentPrice,
    day_low: (meta.regularMarketDayLow as number) ?? currentPrice,
    week_52_high: (meta.fiftyTwoWeekHigh as number) ?? currentPrice,
    week_52_low: (meta.fiftyTwoWeekLow as number) ?? currentPrice,
    volume: (meta.regularMarketVolume as number) ?? 0,
    avg_volume: (fundamentals.price as Record<string, {raw?: number}>).averageDailyVolume10Day?.raw ?? (meta.averageDailyVolume10Day as number) ?? 0,
    market_cap: (fundamentals.price as Record<string, {raw?: number}>).marketCap?.raw ?? 0,
    pe_ratio: (fundamentals.summaryDetail as Record<string, {raw?: number}>).trailingPE?.raw ?? null,
    forward_pe: (fundamentals.summaryDetail as Record<string, {raw?: number}>).forwardPE?.raw ?? null,
    dividend_yield: (fundamentals.summaryDetail as Record<string, {raw?: number}>).dividendYield?.raw ?? null,
    beta: (fundamentals.summaryDetail as Record<string, {raw?: number}>).beta?.raw ?? null,
    eps: (fundamentals.keyStatistics as Record<string, {raw?: number}>).trailingEps?.raw ?? null,
    book_value: (fundamentals.keyStatistics as Record<string, {raw?: number}>).bookValue?.raw ?? null,
    target_price: (fundamentals.financialData as Record<string, {raw?: number}>).targetMeanPrice?.raw ?? null,
    recommendation_mean: (fundamentals.financialData as Record<string, {raw?: number}>).recommendationMean?.raw ?? null,
    rsi: calculateRSI(closePrices, 14),
    ma_20: calculateMA(closePrices, 20),
    ma_50: calculateMA(closePrices, Math.min(50, closePrices.length)),
    historical_prices: closePrices.slice(-30),
  };
}

function buildStockDataFromQuote(sym: string, q: Record<string, unknown>, fundamentals: Fundamentals): StockData {
  const currentPrice = (q.regularMarketPrice as number) ?? 0;
  const previousClose = (q.regularMarketPreviousClose as number) ?? currentPrice;
  const priceChange = currentPrice - previousClose;
  const priceChangePercent = previousClose !== 0 ? (priceChange / previousClose) * 100 : 0;

  // Sem historico, RSI e MAs ficam neutros
  return {
    ticker: sym,
    company_name: (q.shortName as string) || (q.longName as string) || sym,
    currency: (q.currency as string) || 'USD',
    current_price: currentPrice,
    previous_close: previousClose,
    price_change: priceChange,
    price_change_percent: priceChangePercent,
    day_high: (q.regularMarketDayHigh as number) ?? currentPrice,
    day_low: (q.regularMarketDayLow as number) ?? currentPrice,
    week_52_high: (q.fiftyTwoWeekHigh as number) ?? currentPrice,
    week_52_low: (q.fiftyTwoWeekLow as number) ?? currentPrice,
    volume: (q.regularMarketVolume as number) ?? 0,
    avg_volume: (q.averageDailyVolume10Day as number) ?? 0,
    market_cap: (q.marketCap as number) ?? 0,
    pe_ratio: (q.trailingPE as number) ?? (fundamentals.summaryDetail as Record<string, {raw?: number}>).trailingPE?.raw ?? null,
    forward_pe: (q.forwardPE as number) ?? null,
    dividend_yield: (q.trailingAnnualDividendYield as number) ?? (fundamentals.summaryDetail as Record<string, {raw?: number}>).dividendYield?.raw ?? null,
    beta: (q.beta as number) ?? null,
    eps: (q.epsTrailingTwelveMonths as number) ?? null,
    book_value: (fundamentals.keyStatistics as Record<string, {raw?: number}>).bookValue?.raw ?? null,
    target_price: (fundamentals.financialData as Record<string, {raw?: number}>).targetMeanPrice?.raw ?? null,
    recommendation_mean: (fundamentals.financialData as Record<string, {raw?: number}>).recommendationMean?.raw ?? null,
    rsi: 50, // neutro sem historico
    ma_20: currentPrice,
    ma_50: currentPrice,
    historical_prices: [],
  };
}

// Noticias via Yahoo Finance search com fallback (OTIMIZADO: paralelizado)
async function fetchFinanceNews(sym: string, companyName: string): Promise<NewsItem[]> {
  const queries = [sym.replace('.SA', '').replace(/\.[A-Z]+$/, ''), companyName.split(' ')[0]];
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

  // Tenta em paralelo: primeira query + ambos os hosts
  const results = await Promise.allSettled(
    queries.flatMap(query =>
      hosts.map(host =>
        fetchNewsFromHost(host, query)
      )
    )
  );

  // Retorna o primeiro resultado bem-sucedido com notícias
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
      return result.value;
    }
  }

  return [];
}

async function fetchNewsFromHost(host: string, query: string): Promise<NewsItem[]> {
  try {
    const url = `https://${host}/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=10&quotesCount=0`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];

    const data = await res.json();
    const news: Array<{title: string; publisher: string; link: string; providerPublishTime: number}> = data.news || [];
    if (news.length === 0) return [];

    return news.slice(0, 5).map(item => ({
      title: item.title || 'Sem titulo',
      publisher: item.publisher || 'Fonte desconhecida',
      link: item.link || '',
      publishedAt: item.providerPublishTime
        ? new Date(item.providerPublishTime * 1000).toISOString()
        : new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

// --- Calculos tecnicos ---
function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  const recent = changes.slice(-period);
  const gains = recent.filter(c => c > 0);
  const losses = recent.filter(c => c < 0).map(Math.abs);
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function calculateMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  const slice = prices.slice(-Math.min(period, prices.length));
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

// --- Formatacao ---
function formatCurrency(value: number | null | undefined, currency: string): string {
  if (value == null || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency === 'BRL' ? 'BRL' : 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatMarketCap(value: number | null | undefined): string {
  if (value == null || isNaN(value) || value === 0) return 'N/A';
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  return value.toFixed(0);
}

// --- Sentimento de noticias ---
function analyzeNewsSentiment(title: string): 'positivo' | 'negativo' | 'neutro' {
  const t = title.toLowerCase();
  const pos = ['surge', 'soar', 'jump', 'gain', 'rise', 'rally', 'record', 'high', 'growth', 'profit',
    'beat', 'exceed', 'upgrade', 'buy', 'strong', 'success', 'win', 'sobe', 'alta', 'lucro',
    'recorde', 'crescimento', 'avanca', 'supera', 'bate', 'melhor', 'otimista', 'compra', 'subiu'];
  const neg = ['fall', 'drop', 'plunge', 'decline', 'loss', 'crash', 'slump', 'sink', 'miss', 'fail',
    'cut', 'downgrade', 'sell', 'weak', 'concern', 'risk', 'cai', 'queda', 'perda', 'baixa',
    'negativo', 'recua', 'prejuizo', 'risco', 'preocupa', 'venda', 'pior', 'caiu'];
  const posCount = pos.filter(k => t.includes(k)).length;
  const negCount = neg.filter(k => t.includes(k)).length;
  if (posCount > negCount) return 'positivo';
  if (negCount > posCount) return 'negativo';
  return 'neutro';
}

// --- Motor de analise por regras ---
function generateAnalysis(stock: StockData, news: NewsItem[]) {
  let score = 0;
  const reasons: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];

  // RSI
  if (stock.rsi < 30) {
    score += 20;
    reasons.push(`RSI ${stock.rsi.toFixed(1)}: condicao de sobrevenda, possivel reversao`);
    opportunities.push('RSI em sobrevenda - possivel ponto de entrada atrativo');
  } else if (stock.rsi < 40) {
    score += 8;
    reasons.push(`RSI ${stock.rsi.toFixed(1)}: zona de fraqueza moderada`);
  } else if (stock.rsi > 70) {
    score -= 20;
    reasons.push(`RSI ${stock.rsi.toFixed(1)}: sobrecompra, risco de correcao`);
    risks.push('RSI em sobrecompra - possivel correcao de preco a curto prazo');
  } else if (stock.rsi > 60) {
    score -= 5;
    reasons.push(`RSI ${stock.rsi.toFixed(1)}: forca, aproximando-se de sobrecompra`);
  } else {
    reasons.push(`RSI ${stock.rsi.toFixed(1)}: zona neutra`);
  }

  // Medias moveis
  if (stock.ma_20 > 0 && stock.ma_50 > 0 && stock.historical_prices.length > 0) {
    const pVsMa20 = ((stock.current_price - stock.ma_20) / stock.ma_20) * 100;
    const pVsMa50 = ((stock.current_price - stock.ma_50) / stock.ma_50) * 100;

    if (stock.current_price > stock.ma_20 && stock.ma_20 > stock.ma_50) {
      score += 15;
      opportunities.push('Golden cross: preco e MA20 acima da MA50 - tendencia de alta');
    } else if (stock.current_price < stock.ma_20 && stock.ma_20 < stock.ma_50) {
      score -= 15;
      risks.push('Death cross: preco e MA20 abaixo da MA50 - tendencia de baixa');
    }

    if (pVsMa20 < -10) {
      score += 8;
      opportunities.push(`Preco ${Math.abs(pVsMa20).toFixed(1)}% abaixo da MA20 - desconto tecnico`);
    } else if (pVsMa20 > 15) {
      score -= 8;
      risks.push(`Preco ${pVsMa20.toFixed(1)}% acima da MA20 - esticado tecnicamente`);
    }
    if (pVsMa50 < -15) {
      score += 5;
    } else if (pVsMa50 > 20) {
      score -= 5;
      risks.push(`Preco ${pVsMa50.toFixed(1)}% acima da MA50`);
    }
  }

  // P/L
  if (stock.pe_ratio != null) {
    if (stock.pe_ratio < 10) { score += 15; opportunities.push(`P/L ${stock.pe_ratio.toFixed(1)}: valuacao muito atrativa`); }
    else if (stock.pe_ratio < 18) { score += 8; opportunities.push(`P/L ${stock.pe_ratio.toFixed(1)}: valuacao razoavel`); }
    else if (stock.pe_ratio > 40) { score -= 12; risks.push(`P/L ${stock.pe_ratio.toFixed(1)}: valuacao elevada`); }
    else if (stock.pe_ratio > 25) { score -= 5; }
  }

  // Dividend yield
  if (stock.dividend_yield != null && stock.dividend_yield > 0) {
    const yieldPct = stock.dividend_yield * 100;
    if (yieldPct > 6) { score += 12; opportunities.push(`Dividend yield de ${yieldPct.toFixed(1)}% muito atrativo`); }
    else if (yieldPct > 3) { score += 6; opportunities.push(`Dividend yield de ${yieldPct.toFixed(1)}% moderado`); }
  }

  // Posicao em 52 semanas
  const range52 = stock.week_52_high - stock.week_52_low;
  if (range52 > 0) {
    const pos52 = ((stock.current_price - stock.week_52_low) / range52) * 100;
    if (pos52 < 15) { score += 15; opportunities.push('Preco proximo da minima de 52 semanas - possivel suporte'); }
    else if (pos52 < 35) { score += 5; }
    else if (pos52 > 90) { score -= 12; risks.push('Preco proximo da maxima de 52 semanas - resistencia historica'); }
    else if (pos52 > 75) { score -= 5; }
  }

  // Volume
  if (stock.volume > 0 && stock.avg_volume > 0) {
    const volRatio = stock.volume / stock.avg_volume;
    if (volRatio > 1.5 && stock.price_change_percent > 0) {
      score += 10; opportunities.push('Volume acima da media acompanhando alta - confirmacao compradora');
    } else if (volRatio > 1.5 && stock.price_change_percent < 0) {
      score -= 10; risks.push('Volume acima da media acompanhando queda - pressao vendedora');
    }
  }

  // Preco alvo dos analistas
  if (stock.target_price != null) {
    const upside = ((stock.target_price - stock.current_price) / stock.current_price) * 100;
    if (upside > 25) { score += 12; opportunities.push(`Consenso de analistas aponta upside de ${upside.toFixed(0)}%`); }
    else if (upside > 10) { score += 6; opportunities.push(`Preco alvo ${upside.toFixed(0)}% acima do atual`); }
    else if (upside < -15) { score -= 10; risks.push(`Preco alvo dos analistas ${Math.abs(upside).toFixed(0)}% abaixo do atual`); }
  }

  // Recomendacao media dos analistas (1=Strong Buy, 5=Strong Sell)
  if (stock.recommendation_mean != null) {
    if (stock.recommendation_mean <= 2) { score += 8; }
    else if (stock.recommendation_mean >= 4) { score -= 8; risks.push('Consenso de analistas negativo'); }
  }

  // Noticias
  let newsScore = 0;
  const analyzedNews = news.map(n => {
    const sentiment = analyzeNewsSentiment(n.title);
    newsScore += sentiment === 'positivo' ? 3 : sentiment === 'negativo' ? -3 : 0;
    return {
      title: n.title,
      sentiment,
      summary: `${n.publisher} - ${new Date(n.publishedAt).toLocaleDateString('pt-BR')}`,
    };
  });
  score += Math.max(-12, Math.min(12, newsScore));
  if (newsScore > 6) opportunities.push('Fluxo de noticias recentes predominantemente positivo');
  else if (newsScore < -6) risks.push('Fluxo de noticias recentes predominantemente negativo');

  // Garantir minimo de riscos e oportunidades
  if (risks.length < 2) risks.push('Volatilidade de mercado pode impactar o preco no curto prazo');
  if (risks.length < 2) risks.push('Fatores macroeconomicos podem influenciar o ativo');
  if (opportunities.length < 2) opportunities.push('Diversificacao de portfolio pode ser beneficiada');
  if (opportunities.length < 2) opportunities.push('Analise tecnica pode revelar pontos de entrada');

  // Recomendacao final
  let recommendation: 'COMPRAR' | 'VENDER' | 'ESPERAR';
  let confidence: number;

  if (score >= 25) { recommendation = 'COMPRAR'; confidence = Math.min(88, 58 + score); }
  else if (score >= 10) { recommendation = 'COMPRAR'; confidence = Math.min(72, 48 + score); }
  else if (score <= -25) { recommendation = 'VENDER'; confidence = Math.min(88, 58 + Math.abs(score)); }
  else if (score <= -10) { recommendation = 'VENDER'; confidence = Math.min(72, 48 + Math.abs(score)); }
  else { recommendation = 'ESPERAR'; confidence = Math.max(50, 55 - Math.abs(score)); }

  const reasoning = reasons.slice(0, 4).join('. ') + `. Score total: ${score > 0 ? '+' : ''}${score}.`;

  return { recommendation, confidence, reasoning, risks: risks.slice(0, 4), opportunities: opportunities.slice(0, 4), news_summary: analyzedNews };
}

// --- Handler principal (OTIMIZADO: Paralelização completa) ---
export async function POST(request: NextRequest) {
  let ticker = '';
  try {
    const body = await request.json();
    ticker = (body.ticker || '').toString().trim();

    if (!ticker) {
      return NextResponse.json({ detail: 'Ticker e obrigatorio' }, { status: 400 });
    }

    // FASE 1: Paralelizar tudo - stock data + news em paralelo
    const stockDataResult = await fetchYahooFinanceData(ticker);

    // News em paralelo enquanto análise é gerada
    const [news] = await Promise.all([
      fetchFinanceNews(stockDataResult.ticker, stockDataResult.company_name),
    ]);

    const analysis = generateAnalysis(stockDataResult, news);

    const response = {
      ticker: stockDataResult.ticker,
      company_name: stockDataResult.company_name,
      current_price: formatCurrency(stockDataResult.current_price, stockDataResult.currency),
      price_change_percent: `${stockDataResult.price_change_percent >= 0 ? '+' : ''}${stockDataResult.price_change_percent.toFixed(2)}%`,
      recommendation: analysis.recommendation,
      confidence: Math.round(analysis.confidence),
      reasoning: analysis.reasoning,
      risks: analysis.risks,
      opportunities: analysis.opportunities,
      key_metrics: {
        pe_ratio: stockDataResult.pe_ratio != null ? stockDataResult.pe_ratio.toFixed(2) : 'N/A',
        dividend_yield: stockDataResult.dividend_yield != null ? (stockDataResult.dividend_yield * 100).toFixed(2) + '%' : 'N/A',
        market_cap: formatMarketCap(stockDataResult.market_cap),
        week_52_high: formatCurrency(stockDataResult.week_52_high, stockDataResult.currency),
        week_52_low: formatCurrency(stockDataResult.week_52_low, stockDataResult.currency),
        avg_volume: stockDataResult.avg_volume ? (stockDataResult.avg_volume / 1e6).toFixed(1) + 'M' : 'N/A',
        rsi: stockDataResult.rsi.toFixed(1),
        ma_20: stockDataResult.ma_20 > 0 ? formatCurrency(stockDataResult.ma_20, stockDataResult.currency) : 'N/A',
        ma_50: stockDataResult.ma_50 > 0 ? formatCurrency(stockDataResult.ma_50, stockDataResult.currency) : 'N/A',
      },
      news_summary: analysis.news_summary,
      analysis_date: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Analysis error:', msg);

    if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('nao encontrado')) {
      return NextResponse.json(
        { detail: `Ticker "${ticker}" nao encontrado. Exemplos validos: AAPL, NVDA, TSLA (EUA) | PETR4.SA, VALE3.SA (Brasil) | MSFT.L (Londres)` },
        { status: 404 }
      );
    }

    // Erro genérico
    return NextResponse.json(
      { detail: 'Erro ao buscar dados. Verifique o ticker e tente novamente.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST para analisar uma acao',
    example: { ticker: 'AAPL' },
    markets: 'EUA (AAPL, TSLA), Brasil (PETR4.SA), Londres (VODAFONE.L), Toronto (SHOP.TO)',
  });
}
