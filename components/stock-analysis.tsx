'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Search, BarChart3, Newspaper } from 'lucide-react';
import { apiClient, AnalysisResponse } from '@/lib/api-client';

function SkeletonCard() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="animate-shimmer h-8 w-48 rounded-md mb-4" />
        <div className="animate-shimmer h-6 w-32 rounded-md mb-2" />
        <div className="animate-shimmer h-4 w-full rounded-md" />
      </div>
      <div className="grid grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-secondary/50 p-4">
            <div className="animate-shimmer h-3 w-16 rounded-md mx-auto mb-2" />
            <div className="animate-shimmer h-5 w-20 rounded-md mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StockAnalysis() {
  const [ticker, setTicker] = useState('');
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!ticker.trim()) return;

      setIsLoading(true);
      setError(null);
      setData(null);

      try {
        const result = await apiClient.analyzeStock(ticker);
        setData(result);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao buscar análise';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [ticker]
  );

  const getRecommendationStyles = (recommendation: string) => {
    switch (recommendation) {
      case 'COMPRAR':
        return {
          border: 'border-l-[hsl(160_70%_42%)]',
          bg: 'bg-[hsl(160_70%_42%/0.08)]',
          badge: 'bg-[hsl(160_70%_42%)] text-white',
          icon: <TrendingUp className="w-5 h-5" />,
        };
      case 'VENDER':
        return {
          border: 'border-l-[hsl(0_72%_51%)]',
          bg: 'bg-[hsl(0_72%_51%/0.08)]',
          badge: 'bg-[hsl(0_72%_51%)] text-white',
          icon: <TrendingDown className="w-5 h-5" />,
        };
      case 'ESPERAR':
        return {
          border: 'border-l-[hsl(38_92%_50%)]',
          bg: 'bg-[hsl(38_92%_50%/0.08)]',
          badge: 'bg-[hsl(38_92%_50%)] text-white',
          icon: <AlertTriangle className="w-5 h-5" />,
        };
      default:
        return {
          border: 'border-l-border',
          bg: 'bg-secondary/50',
          badge: 'bg-secondary text-foreground',
          icon: null,
        };
    }
  };

  const getSentimentStyles = (sentiment: string) => {
    switch (sentiment) {
      case 'positivo':
        return 'bg-[hsl(160_70%_42%/0.1)] text-[hsl(160_70%_38%)]';
      case 'negativo':
        return 'bg-[hsl(0_72%_51%/0.1)] text-[hsl(0_72%_45%)]';
      case 'neutro':
      default:
        return 'bg-secondary text-muted-foreground';
    }
  };

  const recStyles = data ? getRecommendationStyles(data.recommendation) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Sticky com Blur */}
      <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-md bg-background/80">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[hsl(160_70%_42%)] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-[family-name:var(--font-space-grotesk)]">
              EiBolsa
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Search Hero Section */}
        <div className="mb-12 animate-fade-up">
          <div 
            className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 glow-green"
          >
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="relative flex-1">
                <BarChart3 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Digite o ticker (ex: AAPL, PETR4.SA)"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="pl-12 h-12 text-lg bg-background border-border/50 focus:border-[hsl(160_70%_42%)] focus:ring-[hsl(160_70%_42%/0.3)]"
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !ticker.trim()}
                className="h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Analisando</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    <span>Analisar</span>
                  </div>
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Exemplos: AAPL, GOOGL, MSFT, PETR4.SA, VALE3.SA
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 rounded-xl border border-[hsl(0_72%_51%/0.3)] bg-[hsl(0_72%_51%/0.05)] text-[hsl(0_72%_45%)] animate-fade-up">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Erro ao buscar análise</p>
                <p className="text-sm mt-1 opacity-80">Verifique se o ticker é válido ou tente novamente.</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && <SkeletonCard />}

        {/* Results Section */}
        {data && !isLoading && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* Main Recommendation Card */}
            <div 
              className={`rounded-xl border border-border/50 border-l-4 ${recStyles?.border} ${recStyles?.bg} p-6 animate-fade-up`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">
                      {data.ticker}
                    </h2>
                    <span 
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${recStyles?.badge}`}
                    >
                      {recStyles?.icon}
                      {data.recommendation}
                    </span>
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(160_70%_42%)] opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[hsl(160_70%_42%)]" />
                    </span>
                  </div>
                  <p className="text-muted-foreground">{data.company_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">
                    {data.current_price}
                  </p>
                  <p 
                    className={`text-sm font-medium ${
                      data.price_change_percent.startsWith('+') || data.price_change_percent.startsWith('-') === false
                        ? data.price_change_percent.includes('-') 
                          ? 'text-[hsl(0_72%_51%)]' 
                          : 'text-[hsl(160_70%_42%)]'
                        : data.price_change_percent.startsWith('-')
                          ? 'text-[hsl(0_72%_51%)]'
                          : 'text-[hsl(160_70%_42%)]'
                    }`}
                  >
                    {data.price_change_percent}
                  </p>
                </div>
              </div>
              
              {/* Confidence Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  <span>Confiança</span>
                  <span className="font-bold text-foreground">{data.confidence}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[hsl(160_70%_42%)] rounded-full transition-all duration-500"
                    style={{ width: `${data.confidence}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Analysis Card */}
            <div className="rounded-xl border border-border/50 bg-card p-6 animate-fade-up animation-delay-100">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-[hsl(160_70%_42%)]" />
                <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  Análise Detalhada
                </h3>
              </div>
              <p className="text-foreground leading-relaxed">
                {data.reasoning}
              </p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 animate-fade-up animation-delay-200">
              {[
                { label: 'Market Cap', value: data.key_metrics.market_cap },
                { label: 'P/L', value: data.key_metrics.pe_ratio },
                { label: 'Div. Yield', value: data.key_metrics.dividend_yield },
                { label: 'Máx. 52s', value: data.key_metrics.week_52_high },
                { label: 'Mín. 52s', value: data.key_metrics.week_52_low },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl bg-secondary/50 p-4 text-center"
                >
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {metric.label}
                  </p>
                  <p className="text-lg font-bold font-[family-name:var(--font-space-grotesk)]">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Risks and Opportunities Grid */}
            <div className="grid sm:grid-cols-2 gap-4 animate-fade-up animation-delay-300">
              {/* Risks */}
              <div className="rounded-xl border border-border/50 bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-[hsl(0_72%_51%)]" />
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Riscos
                  </h3>
                </div>
                <ul className="space-y-2">
                  {data.risks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-[hsl(0_72%_51%)] mt-1.5 text-xs">&#9679;</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Opportunities */}
              <div className="rounded-xl border border-border/50 bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-[hsl(160_70%_42%)]" />
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Oportunidades
                  </h3>
                </div>
                <ul className="space-y-2">
                  {data.opportunities.map((opp, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-[hsl(160_70%_42%)] mt-1.5 text-xs">&#9679;</span>
                      <span>{opp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* News Card */}
            {data.news_summary.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-5 animate-fade-up animation-delay-400">
                <div className="flex items-center gap-2 mb-4">
                  <Newspaper className="w-5 h-5 text-muted-foreground" />
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Notícias Recentes
                  </h3>
                </div>
                <div className="space-y-3">
                  {data.news_summary.map((news, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{news.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{news.summary}</p>
                      </div>
                      <span 
                        className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${getSentimentStyles(news.sentiment)}`}
                      >
                        {news.sentiment.charAt(0).toUpperCase() + news.sentiment.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamp Footer */}
            <div className="text-center text-xs text-muted-foreground animate-fade-up animation-delay-500">
              <p>
                Análise realizada em{' '}
                {new Date(data.analysis_date).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!data && !isLoading && !error && (
          <div className="text-center py-12 animate-fade-up">
            <div className="rounded-xl border border-border/50 bg-card p-12">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold font-[family-name:var(--font-space-grotesk)]">
                Digite um ticker para começar
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Analise ações americanas e brasileiras com inteligência artificial
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
