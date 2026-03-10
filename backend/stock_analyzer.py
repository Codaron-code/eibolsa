import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
import os
import json
import logging

logger = logging.getLogger(__name__)


class StockAnalyzer:
    def __init__(self):
        self.llm = ChatOpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            model="gpt-4-turbo-preview",
            temperature=0.7,
        )

    def get_stock_data(self, ticker: str):
        """Busca dados da ação usando yfinance"""
        try:
            stock = yf.Ticker(ticker.upper())
            info = stock.info
            
            # Buscar histórico de preços para indicadores técnicos
            hist = stock.history(period="6mo")
            
            return {
                "info": info,
                "history": hist,
            }
        except Exception as e:
            logger.error(f"Erro ao buscar dados de {ticker}: {str(e)}")
            raise

    def calculate_technical_indicators(self, history):
        """Calcula indicadores técnicos"""
        try:
            if history.empty:
                return {}
            
            df = history.copy()
            
            # Médias móveis
            df["MA_20"] = df["Close"].rolling(window=20).mean()
            df["MA_50"] = df["Close"].rolling(window=50).mean()
            
            # RSI (Relative Strength Index)
            delta = df["Close"].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            df["RSI"] = 100 - (100 / (1 + rs))
            
            latest = df.iloc[-1]
            
            return {
                "current_price": latest["Close"],
                "ma_20": latest["MA_20"],
                "ma_50": latest["MA_50"],
                "rsi": latest["RSI"],
            }
        except Exception as e:
            logger.error(f"Erro ao calcular indicadores: {str(e)}")
            return {}

    def format_metric(self, value):
        """Formata valores para exibição"""
        if pd.isna(value) or value is None:
            return "N/A"
        if isinstance(value, (int, float)):
            if abs(value) >= 1e9:
                return f"${value / 1e9:.2f}B"
            elif abs(value) >= 1e6:
                return f"${value / 1e6:.2f}M"
            elif isinstance(value, float):
                return f"{value:.2f}"
            return str(int(value))
        return str(value)

    def generate_analysis(self, ticker: str, stock_data: dict, indicators: dict):
        """Usa LangChain com OpenAI para gerar análise"""
        try:
            info = stock_data["info"]
            
            # Preparar contexto com dados financeiros
            context = f"""
Análise da ação {ticker}:
- Preço atual: ${indicators.get('current_price', 'N/A')}
- P/L: {info.get('trailingPE', 'N/A')}
- Dividend Yield: {info.get('dividendYield', 'N/A')}
- Market Cap: {self.format_metric(info.get('marketCap'))}
- RSI: {indicators.get('rsi', 'N/A')}
- MA20: {indicators.get('ma_20', 'N/A')}
- MA50: {indicators.get('ma_50', 'N/A')}
- 52 Week High: {info.get('fiftyTwoWeekHigh', 'N/A')}
- 52 Week Low: {info.get('fiftyTwoWeekLow', 'N/A')}
"""
            
            prompt = ChatPromptTemplate.from_template("""
Baseado nos seguintes dados financeiros, forneça uma análise de investimento:

{context}

Por favor, responda em JSON com a seguinte estrutura:
{{
    "recommendation": "COMPRAR" ou "VENDER" ou "ESPERAR",
    "confidence": número de 0-100,
    "reasoning": "explicação detalhada da recomendação",
    "risks": ["risco1", "risco2", "risco3"],
    "opportunities": ["oportunidade1", "oportunidade2", "oportunidade3"],
    "news_summary": [
        {{"title": "notícia", "sentiment": "positivo/negativo/neutro", "summary": "resumo"}}
    ]
}}
""")
            
            chain = prompt | self.llm
            response = chain.invoke({"context": context})
            
            # Extrair JSON da resposta
            response_text = response.content
            
            # Tentar parsear JSON
            try:
                # Procurar por JSON na resposta
                start = response_text.find('{')
                end = response_text.rfind('}') + 1
                if start != -1 and end > start:
                    json_str = response_text[start:end]
                    analysis = json.loads(json_str)
                else:
                    analysis = self._default_analysis()
            except json.JSONDecodeError:
                logger.warning(f"Erro ao parsear JSON da resposta: {response_text}")
                analysis = self._default_analysis()
            
            return analysis
        except Exception as e:
            logger.error(f"Erro ao gerar análise: {str(e)}")
            return self._default_analysis()

    def _default_analysis(self):
        """Retorna análise padrão em caso de erro"""
        return {
            "recommendation": "ESPERAR",
            "confidence": 30,
            "reasoning": "Não foi possível gerar análise no momento",
            "risks": ["Dados insuficientes", "Volatilidade do mercado"],
            "opportunities": ["Esperar mais dados", "Acompanhar tendências"],
            "news_summary": [],
        }

    def analyze(self, ticker: str):
        """Análise completa da ação"""
        # Buscar dados
        stock_data = self.get_stock_data(ticker)
        info = stock_data["info"]
        
        # Calcular indicadores
        indicators = self.calculate_technical_indicators(stock_data["history"])
        
        # Gerar análise com IA
        ai_analysis = self.generate_analysis(ticker, stock_data, indicators)
        
        # Preparar resposta
        current_price = indicators.get("current_price", info.get("currentPrice", 0))
        previous_close = info.get("previousClose", current_price)
        price_change = ((current_price - previous_close) / previous_close * 100) if previous_close else 0
        
        return {
            "ticker": ticker.upper(),
            "company_name": info.get("longName", ticker.upper()),
            "current_price": f"${current_price:.2f}",
            "price_change_percent": f"{price_change:+.2f}%",
            "recommendation": ai_analysis.get("recommendation", "ESPERAR"),
            "confidence": ai_analysis.get("confidence", 50),
            "reasoning": ai_analysis.get("reasoning", ""),
            "risks": ai_analysis.get("risks", []),
            "opportunities": ai_analysis.get("opportunities", []),
            "key_metrics": {
                "pe_ratio": self.format_metric(info.get("trailingPE")),
                "dividend_yield": self.format_metric(info.get("dividendYield")),
                "market_cap": self.format_metric(info.get("marketCap")),
                "week_52_high": self.format_metric(info.get("fiftyTwoWeekHigh")),
                "week_52_low": self.format_metric(info.get("fiftyTwoWeekLow")),
                "avg_volume": self.format_metric(info.get("averageVolume")),
                "rsi": self.format_metric(indicators.get("rsi")),
                "ma_20": self.format_metric(indicators.get("ma_20")),
                "ma_50": self.format_metric(indicators.get("ma_50")),
            },
            "news_summary": ai_analysis.get("news_summary", []),
            "analysis_date": datetime.now().isoformat(),
        }
