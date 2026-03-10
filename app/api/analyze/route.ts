import { NextRequest, NextResponse } from 'next/server';
import { generateText, Output } from 'ai';
import { z } from 'zod';

// Schema para a resposta estruturada do AI
const AnalysisSchema = z.object({
  recommendation: z.enum(['COMPRAR', 'VENDER', 'ESPERAR']),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  risks: z.array(z.string()),
  opportunities: z.array(z.string()),
  news_analysis: z.array(z.object({
    title: z.string(),
    sentiment: z.enum(['positivo', 'negativo', 'neutro']),
    summary: z.string(),
    impact: z.string(),
  })),
});

// Função para buscar dados do Yahoo Finance
async function fetchYahooFinanceData(ticker: string) {
  const formattedTicker = ticker.toUpperCase();
  
  try {
    // Yahoo Finance API v8 - Quote endpoint
    const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedTicker}?interval=1d&range=1mo`;
    const quoteResponse = await fetch(quoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!quoteResponse.ok) {
      throw new Error(`Yahoo Finance API error: ${quoteResponse.status}`);
    }
    
    const quoteData = await quoteResponse.json();
    const chart = quoteData.chart?.result?.[0];
    
    if (!chart) {
      throw new Error('Ticker not found');
    }
    
    const meta = chart.meta;
    const quotes = chart.indicators?.quote?.[0];
    const timestamps = chart.timestamp || [];
    
    // Calcular dados históricos para análise técnica
    const closePrices = quotes?.close?.filter((p: number | null) => p !== null) || [];
    const volumes = quotes?.volume?.filter((v: number | null) => v !== null) || [];
    
    // Calcular RSI (14 períodos)
    const rsi = calculateRSI(closePrices, 14);
    
    // Calcular médias móveis
    const ma20 = calculateMA(closePrices, 20);
    const ma50 = calculateMA(closePrices, Math.min(50, closePrices.length));
    
    // Buscar dados fundamentalistas
    const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${formattedTicker}?modules=price,summaryDetail,defaultKeyStatistics,financialData`;
    const summaryResponse = await fetch(summaryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    let fundamentals: Record<string, unknown> = {};
    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      const result = summaryData.quoteSummary?.result?.[0];
      fundamentals = {
        price: result?.price || {},
        summaryDetail: result?.summaryDetail || {},
        keyStatistics: result?.defaultKeyStatistics || {},
        financialData: result?.financialData || {},
      };
    }
    
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose || meta.chartPreviousClose;
    const priceChange = currentPrice - previousClose;
    const priceChangePercent = (priceChange / previousClose) * 100;
    
    return {
      ticker: formattedTicker,
      company_name: meta.shortName || meta.longName || formattedTicker,
      currency: meta.currency || 'USD',
      current_price: currentPrice,
      previous_close: previousClose,
      price_change: priceChange,
      price_change_percent: priceChangePercent,
      day_high: meta.regularMarketDayHigh,
      day_low: meta.regularMarketDayLow,
      week_52_high: meta.fiftyTwoWeekHigh,
      week_52_low: meta.fiftyTwoWeekLow,
      volume: meta.regularMarketVolume,
      avg_volume: (fundamentals.price as Record<string, { raw?: number }>)?.averageDailyVolume10Day?.raw || meta.averageDailyVolume10Day,
      market_cap: (fundamentals.price as Record<string, { raw?: number }>)?.marketCap?.raw,
      pe_ratio: (fundamentals.summaryDetail as Record<string, { raw?: number }>)?.trailingPE?.raw,
      forward_pe: (fundamentals.summaryDetail as Record<string, { raw?: number }>)?.forwardPE?.raw,
      dividend_yield: (fundamentals.summaryDetail as Record<string, { raw?: number }>)?.dividendYield?.raw,
      beta: (fundamentals.summaryDetail as Record<string, { raw?: number }>)?.beta?.raw,
      eps: (fundamentals.keyStatistics as Record<string, { raw?: number }>)?.trailingEps?.raw,
      book_value: (fundamentals.keyStatistics as Record<string, { raw?: number }>)?.bookValue?.raw,
      target_price: (fundamentals.financialData as Record<string, { raw?: number }>)?.targetMeanPrice?.raw,
      recommendation_mean: (fundamentals.financialData as Record<string, { raw?: number }>)?.recommendationMean?.raw,
      // Indicadores técnicos calculados
      rsi,
      ma_20: ma20,
      ma_50: ma50,
      historical_prices: closePrices.slice(-30),
      historical_volumes: volumes.slice(-30),
    };
  } catch (error) {
    console.error('[v0] Yahoo Finance fetch error:', error);
    throw error;
  }
}

// Função para buscar notícias em tempo real
async function fetchFinanceNews(ticker: string, companyName: string) {
  try {
    // Usar Yahoo Finance News API
    const newsUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&newsCount=10`;
    const response = await fetch(newsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    const news = data.news || [];
    
    return news.slice(0, 5).map((item: { title: string; publisher: string; link: string; providerPublishTime: number }) => ({
      title: item.title,
      publisher: item.publisher,
      link: item.link,
      publishedAt: new Date(item.providerPublishTime * 1000).toISOString(),
    }));
  } catch (error) {
    console.error('[v0] News fetch error:', error);
    return [];
  }
}

// Calcular RSI
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  const recentChanges = changes.slice(-period);
  const gains = recentChanges.filter(c => c > 0);
  const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c));
  
  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calcular Média Móvel
function calculateMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Formatar valores monetários
function formatCurrency(value: number | undefined, currency: string): string {
  if (value === undefined || isNaN(value)) return 'N/A';
  
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency === 'BRL' ? 'BRL' : 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(value);
}

// Formatar market cap
function formatMarketCap(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return 'N/A';
  
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  return value.toFixed(0);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticker } = body;

    if (!ticker || typeof ticker !== 'string') {
      return NextResponse.json(
        { detail: 'Ticker e obrigatorio' },
        { status: 400 }
      );
    }

    // 1. Buscar dados reais do Yahoo Finance
    const stockData = await fetchYahooFinanceData(ticker);
    
    // 2. Buscar noticias em tempo real
    const news = await fetchFinanceNews(ticker, stockData.company_name);
    
    // 3. Preparar contexto para a IA
    const analysisContext = `
## Dados da Acao: ${stockData.ticker} - ${stockData.company_name}

### Preco e Variacao
- Preco Atual: ${formatCurrency(stockData.current_price, stockData.currency)}
- Variacao do Dia: ${stockData.price_change_percent.toFixed(2)}%
- Maxima do Dia: ${formatCurrency(stockData.day_high, stockData.currency)}
- Minima do Dia: ${formatCurrency(stockData.day_low, stockData.currency)}

### Indicadores Fundamentalistas
- Market Cap: ${formatMarketCap(stockData.market_cap)}
- P/L (Trailing): ${stockData.pe_ratio?.toFixed(2) || 'N/A'}
- P/L (Forward): ${stockData.forward_pe?.toFixed(2) || 'N/A'}
- Dividend Yield: ${stockData.dividend_yield ? (stockData.dividend_yield * 100).toFixed(2) + '%' : 'N/A'}
- Beta: ${stockData.beta?.toFixed(2) || 'N/A'}
- EPS: ${stockData.eps?.toFixed(2) || 'N/A'}
- Book Value: ${stockData.book_value?.toFixed(2) || 'N/A'}
- Preco Alvo (Media Analistas): ${formatCurrency(stockData.target_price, stockData.currency)}

### Indicadores Tecnicos
- RSI (14): ${stockData.rsi.toFixed(2)}
- Media Movel 20 dias: ${formatCurrency(stockData.ma_20, stockData.currency)}
- Media Movel 50 dias: ${formatCurrency(stockData.ma_50, stockData.currency)}
- Maxima 52 semanas: ${formatCurrency(stockData.week_52_high, stockData.currency)}
- Minima 52 semanas: ${formatCurrency(stockData.week_52_low, stockData.currency)}
- Volume: ${stockData.volume?.toLocaleString('pt-BR') || 'N/A'}
- Volume Medio (10 dias): ${stockData.avg_volume?.toLocaleString('pt-BR') || 'N/A'}

### Noticias Recentes (ultimas 24-48h)
${news.length > 0 ? news.map((n: { title: string; publisher: string; publishedAt: string }, i: number) => `${i + 1}. "${n.title}" - ${n.publisher} (${new Date(n.publishedAt).toLocaleDateString('pt-BR')})`).join('\n') : 'Nenhuma noticia recente encontrada.'}
`;

    // 4. Gerar analise com IA
    const { output } = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({
        schema: AnalysisSchema,
      }),
      system: `Voce e um analista financeiro experiente especializado em acoes brasileiras e americanas. 
Analise os dados fornecidos e forneca uma recomendacao clara e fundamentada.

Regras:
- Seja objetivo e baseie-se nos dados apresentados
- Considere indicadores tecnicos (RSI, medias moveis) e fundamentalistas (P/L, dividend yield)
- Analise o sentimento das noticias recentes
- A confianca deve refletir a qualidade e consistencia dos sinais
- Identifique riscos e oportunidades especificos para esta acao
- Responda em portugues brasileiro

Para a recomendacao:
- COMPRAR: Sinais positivos predominam (RSI < 70, preco abaixo das medias, noticias positivas, valuacao atrativa)
- VENDER: Sinais negativos predominam (RSI > 70, preco muito acima das medias, noticias negativas, valuacao cara)
- ESPERAR: Sinais mistos ou incertos`,
      prompt: analysisContext,
      maxOutputTokens: 2000,
      temperature: 0.3,
    });

    if (!output) {
      throw new Error('Falha ao gerar analise');
    }

    // 5. Montar resposta final
    const response = {
      ticker: stockData.ticker,
      company_name: stockData.company_name,
      current_price: formatCurrency(stockData.current_price, stockData.currency),
      price_change_percent: `${stockData.price_change_percent >= 0 ? '+' : ''}${stockData.price_change_percent.toFixed(2)}%`,
      recommendation: output.recommendation,
      confidence: output.confidence,
      reasoning: output.reasoning,
      risks: output.risks,
      opportunities: output.opportunities,
      key_metrics: {
        pe_ratio: stockData.pe_ratio?.toFixed(2) || 'N/A',
        dividend_yield: stockData.dividend_yield ? (stockData.dividend_yield * 100).toFixed(2) + '%' : 'N/A',
        market_cap: formatMarketCap(stockData.market_cap),
        week_52_high: formatCurrency(stockData.week_52_high, stockData.currency),
        week_52_low: formatCurrency(stockData.week_52_low, stockData.currency),
        avg_volume: stockData.avg_volume ? (stockData.avg_volume / 1e6).toFixed(1) + 'M' : 'N/A',
        rsi: stockData.rsi.toFixed(1),
        ma_20: formatCurrency(stockData.ma_20, stockData.currency),
        ma_50: formatCurrency(stockData.ma_50, stockData.currency),
      },
      news_summary: output.news_analysis.map(n => ({
        title: n.title,
        sentiment: n.sentiment,
        summary: n.summary,
      })),
      analysis_date: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[v0] Analysis error:', error);
    
    if (error instanceof Error && error.message === 'Ticker not found') {
      return NextResponse.json(
        { detail: 'Ticker nao encontrado. Verifique se o simbolo esta correto.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { detail: 'Erro ao processar analise. Tente novamente.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST para analisar uma acao',
    example: { ticker: 'AAPL' },
    supported_markets: ['US (AAPL, GOOGL, MSFT)', 'BR (PETR4.SA, VALE3.SA, ITUB4.SA)'],
  });
}
