import { NextRequest, NextResponse } from 'next/server';

// Mock data para demonstração no ambiente v0
// Em produção, use o backend FastAPI real
function generateMockAnalysis(ticker: string) {
  const isPositive = Math.random() > 0.4;
  const recommendations = ['COMPRAR', 'VENDER', 'ESPERAR'] as const;
  const recommendation = recommendations[Math.floor(Math.random() * 3)];
  
  const basePrice = 50 + Math.random() * 200;
  const changePercent = (Math.random() * 10 - 5).toFixed(2);
  
  return {
    ticker: ticker.toUpperCase(),
    company_name: getCompanyName(ticker),
    current_price: `R$ ${basePrice.toFixed(2)}`,
    price_change_percent: `${parseFloat(changePercent) >= 0 ? '+' : ''}${changePercent}%`,
    recommendation,
    confidence: Math.floor(60 + Math.random() * 35),
    reasoning: generateReasoning(ticker, recommendation),
    risks: generateRisks(ticker),
    opportunities: generateOpportunities(ticker),
    key_metrics: {
      pe_ratio: (10 + Math.random() * 20).toFixed(2),
      dividend_yield: (1 + Math.random() * 8).toFixed(2) + '%',
      market_cap: `R$ ${(10 + Math.random() * 500).toFixed(1)}B`,
      week_52_high: `R$ ${(basePrice * 1.3).toFixed(2)}`,
      week_52_low: `R$ ${(basePrice * 0.7).toFixed(2)}`,
      avg_volume: `${(1 + Math.random() * 50).toFixed(1)}M`,
      rsi: (30 + Math.random() * 40).toFixed(1),
      ma_20: `R$ ${(basePrice * (0.95 + Math.random() * 0.1)).toFixed(2)}`,
      ma_50: `R$ ${(basePrice * (0.9 + Math.random() * 0.2)).toFixed(2)}`,
    },
    news_summary: generateNews(ticker),
    analysis_date: new Date().toISOString(),
  };
}

function getCompanyName(ticker: string): string {
  const companies: Record<string, string> = {
    'PETR4': 'Petrobras PN',
    'VALE3': 'Vale ON',
    'ITUB4': 'Itaú Unibanco PN',
    'BBDC4': 'Bradesco PN',
    'ABEV3': 'Ambev ON',
    'WEGE3': 'WEG ON',
    'RENT3': 'Localiza ON',
    'MGLU3': 'Magazine Luiza ON',
    'AAPL': 'Apple Inc.',
    'GOOGL': 'Alphabet Inc.',
    'MSFT': 'Microsoft Corporation',
    'AMZN': 'Amazon.com Inc.',
    'TSLA': 'Tesla Inc.',
    'NVDA': 'NVIDIA Corporation',
  };
  return companies[ticker.toUpperCase()] || `${ticker.toUpperCase()} Corporation`;
}

function generateReasoning(ticker: string, recommendation: string): string {
  const reasonings: Record<string, string> = {
    'COMPRAR': `A análise técnica e fundamentalista de ${ticker} indica um momento favorável para compra. Os indicadores técnicos mostram força compradora, com o RSI em zona neutra e as médias móveis alinhadas positivamente. Os fundamentos da empresa permanecem sólidos, com crescimento de receita e margens operacionais estáveis.`,
    'VENDER': `Os indicadores de ${ticker} sugerem cautela. O papel apresenta sinais de sobrecompra no curto prazo, com o RSI próximo de níveis de saturação. Recomenda-se realizar lucros parciais e aguardar uma correção para possível reentrada em níveis mais atrativos.`,
    'ESPERAR': `${ticker} encontra-se em uma zona de indefinição. Os indicadores técnicos estão mistos, sem uma tendência clara definida. Recomenda-se aguardar um rompimento de resistência ou suporte antes de tomar uma decisão de investimento.`,
  };
  return reasonings[recommendation];
}

function generateRisks(ticker: string): string[] {
  const allRisks = [
    'Volatilidade cambial pode impactar resultados',
    'Cenário macroeconômico incerto',
    'Competição acirrada no setor',
    'Dependência de commodities',
    'Riscos regulatórios',
    'Alta alavancagem financeira',
    'Exposição a mercados emergentes',
    'Pressão nas margens operacionais',
  ];
  const count = 2 + Math.floor(Math.random() * 3);
  return allRisks.sort(() => Math.random() - 0.5).slice(0, count);
}

function generateOpportunities(ticker: string): string[] {
  const allOpportunities = [
    'Expansão para novos mercados',
    'Lançamento de novos produtos',
    'Aquisições estratégicas',
    'Melhoria de eficiência operacional',
    'Crescimento do setor de atuação',
    'Dividendos atrativos',
    'Posição de liderança no mercado',
    'Investimentos em inovação',
  ];
  const count = 2 + Math.floor(Math.random() * 3);
  return allOpportunities.sort(() => Math.random() - 0.5).slice(0, count);
}

function generateNews(ticker: string): Array<{ title: string; sentiment: 'positivo' | 'negativo' | 'neutro'; summary: string }> {
  const newsTemplates = [
    { title: `${ticker} reporta resultados acima das expectativas`, sentiment: 'positivo' as const, summary: 'Lucro líquido superou projeções dos analistas em 15%, impulsionado por forte demanda.' },
    { title: `Analistas elevam preço-alvo de ${ticker}`, sentiment: 'positivo' as const, summary: 'Principais casas de análise revisam estimativas para cima após resultados trimestrais.' },
    { title: `${ticker} anuncia programa de recompra de ações`, sentiment: 'positivo' as const, summary: 'Empresa aprova recompra de até 5% das ações em circulação nos próximos 12 meses.' },
    { title: `Setor de ${ticker} enfrenta desafios regulatórios`, sentiment: 'negativo' as const, summary: 'Novas regulamentações podem impactar margens operacionais no médio prazo.' },
    { title: `${ticker} mantém guidance para o ano`, sentiment: 'neutro' as const, summary: 'Empresa reafirma projeções de crescimento de receita entre 8% e 12%.' },
  ];
  
  const count = 2 + Math.floor(Math.random() * 2);
  return newsTemplates.sort(() => Math.random() - 0.5).slice(0, count);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticker } = body;

    if (!ticker || typeof ticker !== 'string') {
      return NextResponse.json(
        { detail: 'Ticker é obrigatório' },
        { status: 400 }
      );
    }

    // Simula delay de processamento
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const analysis = generateMockAnalysis(ticker);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('[v0] Erro ao processar análise:', error);
    return NextResponse.json(
      { detail: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST para analisar uma ação',
    example: { ticker: 'PETR4' },
  });
}
