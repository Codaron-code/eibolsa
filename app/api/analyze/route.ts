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

// Funcao para buscar dados do Yahoo Finance
async function fetchYahooFinanceData(ticker: string): Promise<StockData> {
  const formattedTicker = ticker.toUpperCase();
  
  // Yahoo Finance API v8 - Quote endpoint
  const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedTicker}?interval=1d&range=3mo`;
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
  
  // Calcular dados historicos para analise tecnica
  const closePrices = quotes?.close?.filter((p: number | null) => p !== null) || [];
  
  // Calcular RSI (14 periodos)
  const rsi = calculateRSI(closePrices, 14);
  
  // Calcular medias moveis
  const ma20 = calculateMA(closePrices, 20);
  const ma50 = calculateMA(closePrices, Math.min(50, closePrices.length));
  
  // Buscar dados fundamentalistas
  const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${formattedTicker}?modules=price,summaryDetail,defaultKeyStatistics,financialData`;
  const summaryResponse = await fetch(summaryUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  
  let fundamentals: {
    price?: Record<string, { raw?: number }>;
    summaryDetail?: Record<string, { raw?: number }>;
    keyStatistics?: Record<string, { raw?: number }>;
    financialData?: Record<string, { raw?: number }>;
  } = {};
  
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
    avg_volume: fundamentals.price?.averageDailyVolume10Day?.raw || meta.averageDailyVolume10Day,
    market_cap: fundamentals.price?.marketCap?.raw || 0,
    pe_ratio: fundamentals.summaryDetail?.trailingPE?.raw || null,
    forward_pe: fundamentals.summaryDetail?.forwardPE?.raw || null,
    dividend_yield: fundamentals.summaryDetail?.dividendYield?.raw || null,
    beta: fundamentals.summaryDetail?.beta?.raw || null,
    eps: fundamentals.keyStatistics?.trailingEps?.raw || null,
    book_value: fundamentals.keyStatistics?.bookValue?.raw || null,
    target_price: fundamentals.financialData?.targetMeanPrice?.raw || null,
    recommendation_mean: fundamentals.financialData?.recommendationMean?.raw || null,
    rsi,
    ma_20: ma20,
    ma_50: ma50,
    historical_prices: closePrices.slice(-30),
  };
}

// Funcao para buscar noticias em tempo real
async function fetchFinanceNews(ticker: string): Promise<NewsItem[]> {
  try {
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
  } catch {
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

// Calcular Media Movel
function calculateMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Formatar valores monetarios
function formatCurrency(value: number | undefined | null, currency: string): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency === 'BRL' ? 'BRL' : 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(value);
}

// Formatar market cap
function formatMarketCap(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  return value.toFixed(0);
}

// Analisar sentimento das noticias baseado em palavras-chave
function analyzeNewsSentiment(title: string): 'positivo' | 'negativo' | 'neutro' {
  const lowerTitle = title.toLowerCase();
  
  const positiveKeywords = [
    'surge', 'soar', 'jump', 'gain', 'rise', 'rally', 'record', 'high', 'growth',
    'profit', 'beat', 'exceed', 'upgrade', 'buy', 'strong', 'success', 'win',
    'sobe', 'alta', 'lucro', 'recorde', 'crescimento', 'positivo', 'avanca',
    'supera', 'bate', 'melhor', 'otimista', 'compra'
  ];
  
  const negativeKeywords = [
    'fall', 'drop', 'plunge', 'decline', 'loss', 'crash', 'slump', 'sink',
    'miss', 'fail', 'cut', 'downgrade', 'sell', 'weak', 'concern', 'risk',
    'cai', 'queda', 'perda', 'baixa', 'negativo', 'recua', 'prejuizo',
    'risco', 'preocupa', 'venda', 'pior'
  ];
  
  const positiveCount = positiveKeywords.filter(k => lowerTitle.includes(k)).length;
  const negativeCount = negativeKeywords.filter(k => lowerTitle.includes(k)).length;
  
  if (positiveCount > negativeCount) return 'positivo';
  if (negativeCount > positiveCount) return 'negativo';
  return 'neutro';
}

// Sistema de analise baseado em regras sofisticadas
function generateAnalysis(stockData: StockData, news: NewsItem[]) {
  let score = 0;
  const reasons: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];
  
  // 1. Analise do RSI (Peso: 20 pontos)
  if (stockData.rsi < 30) {
    score += 20;
    reasons.push(`RSI em ${stockData.rsi.toFixed(1)} indica condicao de sobrevenda - possivel reversao de alta`);
    opportunities.push('Condicao de sobrevenda pode indicar ponto de entrada atrativo');
  } else if (stockData.rsi < 40) {
    score += 10;
    reasons.push(`RSI em ${stockData.rsi.toFixed(1)} sugere fraqueza, mas ainda nao sobrevendido`);
  } else if (stockData.rsi > 70) {
    score -= 20;
    reasons.push(`RSI em ${stockData.rsi.toFixed(1)} indica sobrecompra - possivel correcao`);
    risks.push('Condicao de sobrecompra pode resultar em correcao de preco');
  } else if (stockData.rsi > 60) {
    score -= 5;
    reasons.push(`RSI em ${stockData.rsi.toFixed(1)} mostra forca, aproximando-se de sobrecompra`);
  } else {
    reasons.push(`RSI em ${stockData.rsi.toFixed(1)} em zona neutra`);
  }
  
  // 2. Analise de Medias Moveis (Peso: 20 pontos)
  const priceVsMa20 = ((stockData.current_price - stockData.ma_20) / stockData.ma_20) * 100;
  const priceVsMa50 = ((stockData.current_price - stockData.ma_50) / stockData.ma_50) * 100;
  
  if (stockData.current_price > stockData.ma_20 && stockData.ma_20 > stockData.ma_50) {
    score += 15;
    opportunities.push('Tendencia de alta confirmada - preco acima das medias moveis');
  } else if (stockData.current_price < stockData.ma_20 && stockData.ma_20 < stockData.ma_50) {
    score -= 15;
    risks.push('Tendencia de baixa - preco abaixo das medias moveis');
  }
  
  if (priceVsMa20 < -10) {
    score += 10;
    opportunities.push(`Preco ${Math.abs(priceVsMa20).toFixed(1)}% abaixo da MA20 - possivel oportunidade`);
  } else if (priceVsMa20 > 15) {
    score -= 10;
    risks.push(`Preco ${priceVsMa20.toFixed(1)}% acima da MA20 - esticado`);
  }
  
  // 3. Analise de P/L (Peso: 15 pontos)
  if (stockData.pe_ratio !== null) {
    if (stockData.pe_ratio < 10) {
      score += 15;
      opportunities.push(`P/L de ${stockData.pe_ratio.toFixed(1)} indica valuacao muito atrativa`);
    } else if (stockData.pe_ratio < 15) {
      score += 10;
      opportunities.push(`P/L de ${stockData.pe_ratio.toFixed(1)} sugere valuacao razoavel`);
    } else if (stockData.pe_ratio > 30) {
      score -= 10;
      risks.push(`P/L de ${stockData.pe_ratio.toFixed(1)} indica valuacao elevada`);
    } else if (stockData.pe_ratio > 50) {
      score -= 15;
      risks.push(`P/L de ${stockData.pe_ratio.toFixed(1)} muito alto - acao cara`);
    }
  }
  
  // 4. Dividend Yield (Peso: 10 pontos)
  if (stockData.dividend_yield !== null && stockData.dividend_yield > 0) {
    const yieldPercent = stockData.dividend_yield * 100;
    if (yieldPercent > 5) {
      score += 10;
      opportunities.push(`Dividend yield de ${yieldPercent.toFixed(1)}% oferece renda atrativa`);
    } else if (yieldPercent > 2) {
      score += 5;
      opportunities.push(`Dividend yield de ${yieldPercent.toFixed(1)}% proporciona renda moderada`);
    }
  }
  
  // 5. Posicao em relacao as maximas/minimas de 52 semanas (Peso: 15 pontos)
  const rangePosition = ((stockData.current_price - stockData.week_52_low) / 
    (stockData.week_52_high - stockData.week_52_low)) * 100;
  
  if (rangePosition < 20) {
    score += 15;
    opportunities.push('Preco proximo da minima de 52 semanas - possivel oportunidade de compra');
  } else if (rangePosition < 40) {
    score += 8;
  } else if (rangePosition > 90) {
    score -= 10;
    risks.push('Preco proximo da maxima de 52 semanas - possivel realizacao de lucros');
  } else if (rangePosition > 80) {
    score -= 5;
  }
  
  // 6. Analise de Volume (Peso: 10 pontos)
  if (stockData.volume && stockData.avg_volume) {
    const volumeRatio = stockData.volume / stockData.avg_volume;
    if (volumeRatio > 1.5 && stockData.price_change_percent > 0) {
      score += 10;
      opportunities.push('Volume acima da media com alta de precos - interesse comprador');
    } else if (volumeRatio > 1.5 && stockData.price_change_percent < 0) {
      score -= 10;
      risks.push('Volume acima da media com queda - pressao vendedora');
    }
  }
  
  // 7. Analise do preco alvo dos analistas (Peso: 10 pontos)
  if (stockData.target_price !== null) {
    const upside = ((stockData.target_price - stockData.current_price) / stockData.current_price) * 100;
    if (upside > 20) {
      score += 10;
      opportunities.push(`Preco alvo dos analistas ${upside.toFixed(0)}% acima do preco atual`);
    } else if (upside > 10) {
      score += 5;
    } else if (upside < -10) {
      score -= 10;
      risks.push(`Preco alvo dos analistas ${Math.abs(upside).toFixed(0)}% abaixo do preco atual`);
    }
  }
  
  // 8. Analise de noticias (Peso: variavel)
  let newsScore = 0;
  const analyzedNews = news.map(n => {
    const sentiment = analyzeNewsSentiment(n.title);
    if (sentiment === 'positivo') newsScore += 3;
    else if (sentiment === 'negativo') newsScore -= 3;
    
    return {
      title: n.title,
      sentiment,
      summary: `Noticia de ${n.publisher} publicada em ${new Date(n.publishedAt).toLocaleDateString('pt-BR')}`,
    };
  });
  
  score += newsScore;
  
  if (newsScore > 5) {
    opportunities.push('Noticias recentes predominantemente positivas');
  } else if (newsScore < -5) {
    risks.push('Noticias recentes predominantemente negativas');
  }
  
  // Determinar recomendacao e confianca
  let recommendation: 'COMPRAR' | 'VENDER' | 'ESPERAR';
  let confidence: number;
  
  if (score >= 30) {
    recommendation = 'COMPRAR';
    confidence = Math.min(85, 60 + score);
  } else if (score >= 15) {
    recommendation = 'COMPRAR';
    confidence = Math.min(70, 50 + score);
  } else if (score <= -30) {
    recommendation = 'VENDER';
    confidence = Math.min(85, 60 + Math.abs(score));
  } else if (score <= -15) {
    recommendation = 'VENDER';
    confidence = Math.min(70, 50 + Math.abs(score));
  } else {
    recommendation = 'ESPERAR';
    confidence = 50 + Math.abs(score);
  }
  
  // Construir reasoning
  const reasoning = reasons.slice(0, 4).join('. ') + 
    `. Score total da analise: ${score > 0 ? '+' : ''}${score} pontos.`;
  
  // Garantir pelo menos 2 riscos e 2 oportunidades
  if (risks.length < 2) {
    risks.push('Volatilidade de mercado pode afetar o preco no curto prazo');
    if (risks.length < 2) {
      risks.push('Fatores macroeconomicos podem influenciar o desempenho');
    }
  }
  
  if (opportunities.length < 2) {
    opportunities.push('Diversificacao do portfolio pode ser beneficiada');
    if (opportunities.length < 2) {
      opportunities.push('Analise mais detalhada pode revelar catalisadores positivos');
    }
  }
  
  return {
    recommendation,
    confidence,
    reasoning,
    risks: risks.slice(0, 4),
    opportunities: opportunities.slice(0, 4),
    news_summary: analyzedNews,
  };
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
    const news = await fetchFinanceNews(ticker);
    
    // 3. Gerar analise com sistema de regras
    const analysis = generateAnalysis(stockData, news);

    // 4. Montar resposta final
    const response = {
      ticker: stockData.ticker,
      company_name: stockData.company_name,
      current_price: formatCurrency(stockData.current_price, stockData.currency),
      price_change_percent: `${stockData.price_change_percent >= 0 ? '+' : ''}${stockData.price_change_percent.toFixed(2)}%`,
      recommendation: analysis.recommendation,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      risks: analysis.risks,
      opportunities: analysis.opportunities,
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
      news_summary: analysis.news_summary,
      analysis_date: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[v0] Analysis error:', error);
    
    if (error instanceof Error && error.message === 'Ticker not found') {
      return NextResponse.json(
        { detail: 'Ticker nao encontrado. Verifique se o simbolo esta correto (ex: AAPL, PETR4.SA).' },
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
    supported_markets: ['US (AAPL, GOOGL, MSFT, NVDA, TSLA)', 'BR (PETR4.SA, VALE3.SA, ITUB4.SA)'],
  });
}
