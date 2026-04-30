from typing import Literal

from pydantic import BaseModel, Field


RiskLevel = Literal["conservative", "balanced", "aggressive"]
Currency = Literal["TWD", "USD"]


class PortfolioCreate(BaseModel):
    totalCapital: float = Field(gt=0)
    targetMonthlyIncome: float = Field(ge=0)
    investmentYears: int = Field(ge=1, le=60)
    riskLevel: RiskLevel
    currency: Currency = "TWD"


class AssetAllocation(BaseModel):
    assetName: str
    allocationPercent: float
    expectedReturn: float
    dividendYield: float
    volatility: float


class InvestmentCandidate(BaseModel):
    symbol: str
    name: str
    category: str
    allocationPercent: float
    expectedAnnualReturn: float
    dividendYield: float
    volatility: float
    riskLabel: Literal["低", "中", "高"]
    rationale: str


class SimulationDiagnostics(BaseModel):
    expectedAnnualReturn: float
    expectedDividendYield: float
    expectedAnnualIncome: float
    withdrawalRate: float
    riskScore: int
    incomeCoverage: float
    recommendationSummary: str
    actionPlan: list[str]


class Portfolio(BaseModel):
    id: str
    userId: str
    totalCapital: float
    targetMonthlyIncome: float
    investmentYears: int
    riskLevel: RiskLevel
    currency: Currency
    assets: list[AssetAllocation]


class SimulationRequest(BaseModel):
    portfolio: PortfolioCreate
    simulations: int = Field(default=3000, ge=100, le=20000)
    seed: int | None = 42


class GrowthPoint(BaseModel):
    year: int
    p5: float
    median: float
    p95: float


class SimulationResult(BaseModel):
    averageMonthlyIncome: float
    successRate: float
    projectedFinalValue: float
    worstCaseValue: float
    maxDrawdown: float
    growth: list[GrowthPoint]
    assets: list[AssetAllocation]
    diagnostics: SimulationDiagnostics
    candidates: list[InvestmentCandidate]


class MarketTrendPoint(BaseModel):
    label: str
    price: float
    changePercent: float
    dayChangePercent: float


class MarketQuote(BaseModel):
    symbol: str
    name: str
    tradeCurrency: Literal["USD", "TWD"] = "USD"
    price: float
    change: float
    changePercent: float
    open: float
    high: float
    low: float
    previousClose: float
    volume: int
    marketCap: float | None = None
    peRatio: float | None = None
    dividendYield: float | None = None
    source: str
    updatedAt: str
    signal: Literal["bullish", "neutral", "caution"]
    analysis: str
    trend: list[MarketTrendPoint] = Field(default_factory=list)


class MarketSnapshot(BaseModel):
    quotes: list[MarketQuote]
    source: str
    updatedAt: str
    summary: str


class MarketChatRequest(BaseModel):
    symbols: list[str] = Field(min_length=1, max_length=20)
    question: str = Field(min_length=1, max_length=1200)


class MarketChatResponse(BaseModel):
    answer: str
    source: Literal["openai", "groq", "local"]
    model: str | None = None
    updatedAt: str
