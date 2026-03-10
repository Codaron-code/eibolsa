from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from models import AnalysisRequest, AnalysisResponse
from stock_analyzer import StockAnalyzer
import logging
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="EiBolsa API",
    description="API de análise de ações com IA",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar domínios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar analisador
analyzer = StockAnalyzer()


@app.get("/health")
async def health_check():
    """Verifica a saúde da API"""
    return {"status": "ok", "service": "EiBolsa API"}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_stock(request: AnalysisRequest):
    """
    Analisa uma ação baseado no ticker fornecido.
    
    - **ticker**: Símbolo da ação (ex: AAPL, MSFT, TSLA)
    """
    try:
        logger.info(f"Iniciando análise para {request.ticker}")
        
        # Validar ticker
        if not request.ticker or len(request.ticker) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ticker não pode estar vazio"
            )
        
        # Realizar análise
        result = analyzer.analyze(request.ticker)
        
        logger.info(f"Análise concluída para {request.ticker}")
        return AnalysisResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao analisar {request.ticker}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao analisar ação: {str(e)}"
        )


@app.get("/tickers")
async def get_tickers_examples():
    """Retorna exemplos de tickers populares"""
    return {
        "popular": [
            {"symbol": "AAPL", "name": "Apple Inc."},
            {"symbol": "MSFT", "name": "Microsoft Corporation"},
            {"symbol": "TSLA", "name": "Tesla Inc."},
            {"symbol": "GOOGL", "name": "Alphabet Inc."},
            {"symbol": "AMZN", "name": "Amazon.com Inc."},
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
