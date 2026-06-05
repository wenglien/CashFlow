from typing import Any, Literal

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


class PortfolioAction(BaseModel):
    title: str
    role: str
    allocationPercent: float
    amount: float
    guidance: str
    symbols: list[str]


class SimulationDiagnostics(BaseModel):
    expectedAnnualReturn: float
    expectedDividendYield: float
    expectedAnnualIncome: float
    withdrawalRate: float
    riskScore: int
    incomeCoverage: float
    recommendationSummary: str
    actionPlan: list[str]
    portfolioBlueprint: list[PortfolioAction]


class SimulationAiInsight(BaseModel):
    headline: str
    systemSignal: Literal["可執行", "需調整", "高壓力"]
    aiSummary: str
    allocationGuidance: list[str]
    riskWarnings: list[str]


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
    marketSymbols: list[str] = Field(default_factory=list, max_length=20)


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
    aiInsight: SimulationAiInsight
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


Market = Literal["TW", "US"]


class FinancialPeriod(BaseModel):
    period: str
    revenue: float | None = None
    grossProfit: float | None = None
    operatingIncome: float | None = None
    netIncome: float | None = None
    eps: float | None = None
    grossMargin: float | None = None
    operatingMargin: float | None = None
    netMargin: float | None = None


class RevenuePoint(BaseModel):
    month: str
    revenue: float
    yoyPercent: float | None = None


class ValuationMetrics(BaseModel):
    per: float | None = None
    pbr: float | None = None
    dividendYield: float | None = None
    marketCap: float | None = None
    roe: float | None = None
    latestPrice: float | None = None
    priceChangePercent: float | None = None
    volatilityPercent: float | None = None
    asOf: str | None = None


class GrowthMetrics(BaseModel):
    revenueYoyPercent: float | None = None
    revenueMomPercent: float | None = None
    epsYoyPercent: float | None = None
    ttmEps: float | None = None


class ScoreItem(BaseModel):
    label: str
    score: int
    weight: float
    detail: str


class FundamentalAnalysis(BaseModel):
    symbol: str
    name: str
    market: Market
    currency: Currency
    industry: str | None = None
    valuation: ValuationMetrics
    growth: GrowthMetrics
    statements: list[FinancialPeriod] = Field(default_factory=list)
    revenueTrend: list[RevenuePoint] = Field(default_factory=list)
    fundamentalScore: int
    scoreBreakdown: list[ScoreItem] = Field(default_factory=list)
    summary: str
    source: str
    updatedAt: str
    dataAvailable: bool = True
    notes: list[str] = Field(default_factory=list)


class InstitutionalPoint(BaseModel):
    date: str
    foreign: float  # 外資淨買賣(張)
    trust: float  # 投信淨買賣(張)
    dealer: float  # 自營商淨買賣(張)


class MarginPoint(BaseModel):
    date: str
    marginBalance: float | None = None  # 融資餘額(張)
    shortBalance: float | None = None  # 融券餘額(張)


class ForeignHoldingPoint(BaseModel):
    date: str
    ratio: float  # 外資持股比率(%)


class ChipMetrics(BaseModel):
    foreignNet5d: float | None = None
    foreignNet20d: float | None = None
    trustNet5d: float | None = None
    dealerNet5d: float | None = None
    consecutiveForeignDays: int = 0  # 正為連續買超天數,負為連續賣超
    marginBalance: float | None = None
    marginChange5dPercent: float | None = None
    shortMarginRatio: float | None = None  # 券資比(%)
    foreignHoldingPercent: float | None = None
    foreignHoldingChange20d: float | None = None


class ChipAnalysis(BaseModel):
    symbol: str
    name: str
    market: Market
    available: bool = True
    metrics: ChipMetrics
    institutionalTrend: list[InstitutionalPoint] = Field(default_factory=list)
    marginTrend: list[MarginPoint] = Field(default_factory=list)
    foreignHoldingTrend: list[ForeignHoldingPoint] = Field(default_factory=list)
    chipScore: int
    scoreBreakdown: list[ScoreItem] = Field(default_factory=list)
    summary: str
    source: str
    updatedAt: str
    notes: list[str] = Field(default_factory=list)


class RadarAxis(BaseModel):
    axis: str
    score: int


class AiReport(BaseModel):
    summary: str
    bullPoints: list[str] = Field(default_factory=list)
    bearPoints: list[str] = Field(default_factory=list)
    source: Literal["openai", "groq", "local"]
    model: str | None = None


class ComprehensiveAnalysis(BaseModel):
    symbol: str
    name: str
    market: Market
    totalScore: int
    rating: str
    radar: list[RadarAxis] = Field(default_factory=list)
    fundamental: FundamentalAnalysis
    chip: ChipAnalysis | None = None
    aiReport: AiReport
    updatedAt: str


BacktestStrategy = Literal["buy_and_hold", "sma_cross", "dca"]


class BacktestRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)
    strategy: BacktestStrategy = "buy_and_hold"
    years: int = Field(default=5, ge=1, le=10)
    initialCapital: float = Field(default=1_000_000, gt=0)
    smaShort: int = Field(default=20, ge=2, le=120)
    smaLong: int = Field(default=60, ge=5, le=250)
    monthlyAmount: float = Field(default=10_000, gt=0)


class EquityPoint(BaseModel):
    date: str
    strategy: float
    benchmark: float


class BacktestMetrics(BaseModel):
    totalReturnPercent: float
    cagrPercent: float
    maxDrawdownPercent: float
    volatilityPercent: float
    sharpe: float
    winRatePercent: float
    tradeCount: int = 0


class BacktestResult(BaseModel):
    symbol: str
    name: str
    market: Market
    strategy: BacktestStrategy
    strategyLabel: str
    startDate: str
    endDate: str
    initialCapital: float
    finalValue: float
    metrics: BacktestMetrics
    benchmark: BacktestMetrics
    equity: list[EquityPoint] = Field(default_factory=list)
    summary: str
    source: str
    updatedAt: str


ScreenerMarket = Literal["TW", "US", "ALL"]


class ScreenerRequest(BaseModel):
    market: ScreenerMarket = "TW"
    minFundamental: int = Field(default=0, ge=0, le=100)
    minChip: int = Field(default=0, ge=0, le=100)
    maxPer: float | None = None
    minDividendYield: float | None = None
    sortBy: Literal["total", "fundamental", "chip", "dividendYield"] = "total"


class ScreenerRow(BaseModel):
    symbol: str
    name: str
    market: Market
    totalScore: int
    fundamentalScore: int
    chipScore: int | None = None
    per: float | None = None
    dividendYield: float | None = None
    revenueYoyPercent: float | None = None


class ScreenerResult(BaseModel):
    rows: list[ScreenerRow] = Field(default_factory=list)
    count: int
    universeSize: int
    market: ScreenerMarket
    updatedAt: str
    notes: list[str] = Field(default_factory=list)


class MarketChatRequest(BaseModel):
    symbols: list[str] = Field(min_length=1, max_length=20)
    question: str = Field(min_length=1, max_length=1200)
    pageContext: dict[str, Any] | None = None


class MarketChatResponse(BaseModel):
    answer: str
    source: Literal["openai", "groq", "local"]
    model: str | None = None
    updatedAt: str
