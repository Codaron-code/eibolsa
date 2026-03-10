from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


class KeyMetrics(BaseModel):
    pe_ratio: str = Field(default="N/A")
    dividend_yield: str = Field(default="N/A")
    market_cap: str = Field(default="N/A")
    week_52_high: str = Field(default="N/A")
    week_52_low: str = Field(default="N/A")
    avg_volume: str = Field(default="N/A")
    rsi: str = Field(default="N/A")
    ma_20: str = Field(default="N/A")
    ma_50: str = Field(default="N/A")


class NewsSummary(BaseModel):
    title: str
    sentiment: Literal["positivo", "negativo", "neutro"]
    summary: str


class AnalysisRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=10)


class AnalysisResponse(BaseModel):
    ticker: str
    company_name: str
    current_price: str
    price_change_percent: str
    recommendation: Literal["COMPRAR", "VENDER", "ESPERAR"]
    confidence: int = Field(..., ge=0, le=100)
    reasoning: str
    risks: list[str]
    opportunities: list[str]
    key_metrics: KeyMetrics
    news_summary: list[NewsSummary]
    analysis_date: str
