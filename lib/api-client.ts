export interface AnalysisRequest {
  ticker: string;
}

export interface KeyMetrics {
  pe_ratio: string;
  dividend_yield: string;
  market_cap: string;
  week_52_high: string;
  week_52_low: string;
  avg_volume: string;
  rsi: string;
  ma_20: string;
  ma_50: string;
}

export interface NewsSummary {
  title: string;
  sentiment: 'positivo' | 'negativo' | 'neutro';
  summary: string;
}

export interface AnalysisResponse {
  ticker: string;
  company_name: string;
  current_price: string;
  price_change_percent: string;
  recommendation: 'COMPRAR' | 'VENDER' | 'ESPERAR';
  confidence: number;
  reasoning: string;
  risks: string[];
  opportunities: string[];
  key_metrics: KeyMetrics;
  news_summary: NewsSummary[];
  analysis_date: string;
}

export interface TickersResponse {
  popular: Array<{
    symbol: string;
    name: string;
  }>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async analyzeStock(ticker: string): Promise<AnalysisResponse> {
    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticker: ticker.toUpperCase() }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Erro ao analisar ação');
    }

    return response.json();
  }

  async getHealthStatus() {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error('Backend não está disponível');
    }
    return response.json();
  }

  async getPopularTickers(): Promise<TickersResponse> {
    const response = await fetch(`${this.baseUrl}/tickers`);
    if (!response.ok) {
      throw new Error('Erro ao buscar tickers');
    }
    return response.json();
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export const apiClient = new APIClient();
