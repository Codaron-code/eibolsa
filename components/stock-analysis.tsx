'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { TrendingUp, TrendingDown, AlertCircle, Lightbulb, Target } from 'lucide-react';
import { apiClient, AnalysisResponse } from '@/lib/api-client';

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
        console.error('[v0] Erro na análise:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [ticker]
  );

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'COMPRAR':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'VENDER':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'ESPERAR':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return '';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positivo':
        return 'bg-green-500/10 text-green-300';
      case 'negativo':
        return 'bg-red-500/10 text-red-300';
      case 'neutro':
      default:
        return 'bg-gray-500/10 text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header com glassmorphism */}
      <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                EiBolsa
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Análise inteligente de ações com IA
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Search Section */}
        <div className="mb-12">
          <div className="backdrop-blur-xl bg-card/40 border border-border/50 rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <Input
                type="text"
                placeholder="Digite o ticker (ex: AAPL, MSFT, TSLA)"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="flex-1 bg-background/50 border-border/50 h-12"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !ticker.trim()}
                className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Spinner className="w-4 h-4" />
                    <span>Analisando...</span>
                  </div>
                ) : (
                  'Analisar'
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Erro ao buscar análise</p>
              <p className="text-sm mt-1">Verifique se o ticker é válido ou tente novamente.</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {(data || isLoading) && (
          <div className="space-y-6">
            {/* Main Card with Price and Recommendation */}
            <div className="backdrop-blur-xl bg-card/40 border border-border/50 rounded-2xl p-8 shadow-2xl">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Spinner className="w-12 h-12 text-blue-400" />
                  <p className="mt-4 text-muted-foreground">Analisando dados financeiros...</p>
                </div>
              ) : data ? (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div>
                      <h2 className="text-4xl font-bold">{data.company_name}</h2>
                      <p className="text-2xl font-semibold text-blue-400 mt-2">
                        {data.current_price}
                        <span
                          className={`ml-3 text-lg font-medium ${
                            data.price_change_percent.startsWith('+')
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}
                        >
                          {data.price_change_percent}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`text-lg px-6 py-2 border ${getRecommendationColor(
                          data.recommendation
                        )}`}
                      >
                        {data.recommendation}
                      </Badge>
                      <div className="text-center backdrop-blur-md bg-background/60 rounded-lg p-3">
                        <p className="text-sm text-muted-foreground">Confiança</p>
                        <p className="text-2xl font-bold text-blue-400">{data.confidence}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Reasoning Card */}
                  <div className="backdrop-blur-md bg-background/40 rounded-xl p-4 border border-border/30">
                    <p className="text-muted-foreground text-sm">
                      <span className="text-blue-400 font-semibold">Análise:</span> {data.reasoning}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Key Metrics Grid */}
            {data && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: 'P/L', value: data.key_metrics.pe_ratio },
                  { label: 'Div. Yield', value: data.key_metrics.dividend_yield },
                  { label: 'Market Cap', value: data.key_metrics.market_cap },
                  { label: '52W Alta', value: data.key_metrics.week_52_high },
                  { label: '52W Baixa', value: data.key_metrics.week_52_low },
                  { label: 'RSI', value: data.key_metrics.rsi },
                  { label: 'MA20', value: data.key_metrics.ma_20 },
                  { label: 'MA50', value: data.key_metrics.ma_50 },
                  { label: 'Volume', value: data.key_metrics.avg_volume },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="backdrop-blur-md bg-card/40 border border-border/50 rounded-xl p-4 text-center"
                  >
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {metric.label}
                    </p>
                    <p className="text-lg font-bold text-blue-400 mt-1">{metric.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Risks and Opportunities */}
            {data && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Risks */}
                <div className="backdrop-blur-xl bg-card/40 border border-border/50 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <h3 className="text-xl font-bold">Riscos</h3>
                  </div>
                  <ul className="space-y-2">
                    {data.risks.map((risk, idx) => (
                      <li
                        key={idx}
                        className="flex gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20 text-sm text-red-300"
                      >
                        <span className="text-red-400 font-bold">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Opportunities */}
                <div className="backdrop-blur-xl bg-card/40 border border-border/50 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-xl font-bold">Oportunidades</h3>
                  </div>
                  <ul className="space-y-2">
                    {data.opportunities.map((opp, idx) => (
                      <li
                        key={idx}
                        className="flex gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/20 text-sm text-green-300"
                      >
                        <span className="text-green-400 font-bold">•</span>
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* News Summary */}
            {data && data.news_summary.length > 0 && (
              <div className="backdrop-blur-xl bg-card/40 border border-border/50 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-blue-400" />
                  <h3 className="text-xl font-bold">Resumo de Notícias</h3>
                </div>
                <div className="space-y-3">
                  {data.news_summary.map((news, idx) => (
                    <div key={idx} className="border border-border/30 rounded-lg p-4 bg-background/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{news.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{news.summary}</p>
                        </div>
                        <Badge className={`flex-shrink-0 ${getSentimentColor(news.sentiment)}`}>
                          {news.sentiment.charAt(0).toUpperCase() + news.sentiment.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer with Timestamp */}
            {data && (
              <div className="text-center text-xs text-muted-foreground">
                <p>
                  Análise realizada em{' '}
                  {new Date(data.analysis_date).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!data && !isLoading && !error && (
          <div className="text-center py-12">
            <div className="backdrop-blur-xl bg-card/40 border border-border/50 rounded-2xl p-12 shadow-2xl">
              <Target className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">Digite um ticker para começar</h3>
              <p className="text-muted-foreground mt-2">
                Exemplos: AAPL, MSFT, TSLA, GOOGL, AMZN
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
