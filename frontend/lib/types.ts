export type RiskLevel = "conservative" | "balanced" | "aggressive";
export type Currency = "USD" | "TWD";

export type PortfolioInput = {
  totalCapital: number;
  targetMonthlyIncome: number;
  investmentYears: number;
  riskLevel: RiskLevel;
  currency: Currency;
};

export type AssetAllocation = {
  assetName: string;
  allocationPercent: number;
  expectedReturn: number;
  dividendYield: number;
  volatility: number;
};

export type InvestmentCandidate = {
  symbol: string;
  name: string;
  category: string;
  allocationPercent: number;
  expectedAnnualReturn: number;
  dividendYield: number;
  volatility: number;
  riskLabel: "低" | "中" | "高";
  rationale: string;
};

export type SimulationDiagnostics = {
  expectedAnnualReturn: number;
  expectedDividendYield: number;
  expectedAnnualIncome: number;
  withdrawalRate: number;
  riskScore: number;
  incomeCoverage: number;
  recommendationSummary: string;
  actionPlan: string[];
};

export type GrowthPoint = {
  year: number;
  p5: number;
  median: number;
  p95: number;
};

export type SimulationResult = {
  averageMonthlyIncome: number;
  successRate: number;
  projectedFinalValue: number;
  worstCaseValue: number;
  maxDrawdown: number;
  growth: GrowthPoint[];
  assets: AssetAllocation[];
  diagnostics: SimulationDiagnostics;
  candidates: InvestmentCandidate[];
};

export type MarketQuote = {
  symbol: string;
  name: string;
  tradeCurrency?: "USD" | "TWD";
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  marketCap: number | null;
  peRatio: number | null;
  dividendYield: number | null;
  source: string;
  updatedAt: string;
  signal: "bullish" | "neutral" | "caution";
  analysis: string;
  trend: {
    label: string;
    price: number;
    changePercent: number;
    dayChangePercent: number;
  }[];
};

export type MarketSnapshot = {
  quotes: MarketQuote[];
  source: string;
  updatedAt: string;
  summary: string;
};

export type FinancialPeriod = {
  period: string;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  eps: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
};

export type RevenuePoint = {
  month: string;
  revenue: number;
  yoyPercent: number | null;
};

export type ValuationMetrics = {
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  marketCap: number | null;
  roe: number | null;
  asOf: string | null;
};

export type GrowthMetrics = {
  revenueYoyPercent: number | null;
  revenueMomPercent: number | null;
  epsYoyPercent: number | null;
  ttmEps: number | null;
};

export type ScoreItem = {
  label: string;
  score: number;
  weight: number;
  detail: string;
};

export type FundamentalAnalysis = {
  symbol: string;
  name: string;
  market: "TW" | "US";
  currency: "TWD" | "USD";
  industry: string | null;
  valuation: ValuationMetrics;
  growth: GrowthMetrics;
  statements: FinancialPeriod[];
  revenueTrend: RevenuePoint[];
  fundamentalScore: number;
  scoreBreakdown: ScoreItem[];
  summary: string;
  source: string;
  updatedAt: string;
  dataAvailable: boolean;
  notes: string[];
};

export type InstitutionalPoint = {
  date: string;
  foreign: number;
  trust: number;
  dealer: number;
};

export type MarginPoint = {
  date: string;
  marginBalance: number | null;
  shortBalance: number | null;
};

export type ForeignHoldingPoint = {
  date: string;
  ratio: number;
};

export type ChipMetrics = {
  foreignNet5d: number | null;
  foreignNet20d: number | null;
  trustNet5d: number | null;
  dealerNet5d: number | null;
  consecutiveForeignDays: number;
  marginBalance: number | null;
  marginChange5dPercent: number | null;
  shortMarginRatio: number | null;
  foreignHoldingPercent: number | null;
  foreignHoldingChange20d: number | null;
};

export type ChipAnalysis = {
  symbol: string;
  name: string;
  market: "TW" | "US";
  available: boolean;
  metrics: ChipMetrics;
  institutionalTrend: InstitutionalPoint[];
  marginTrend: MarginPoint[];
  foreignHoldingTrend: ForeignHoldingPoint[];
  chipScore: number;
  scoreBreakdown: ScoreItem[];
  summary: string;
  source: string;
  updatedAt: string;
  notes: string[];
};

export type RadarAxis = {
  axis: string;
  score: number;
};

export type AiReport = {
  summary: string;
  bullPoints: string[];
  bearPoints: string[];
  source: "openai" | "groq" | "local";
  model: string | null;
};

export type ComprehensiveAnalysis = {
  symbol: string;
  name: string;
  market: "TW" | "US";
  totalScore: number;
  rating: string;
  radar: RadarAxis[];
  fundamental: FundamentalAnalysis;
  chip: ChipAnalysis | null;
  aiReport: AiReport;
  updatedAt: string;
};

export type BacktestStrategy = "buy_and_hold" | "sma_cross" | "dca";

export type BacktestRequestInput = {
  symbol: string;
  strategy: BacktestStrategy;
  years: number;
  initialCapital: number;
  smaShort: number;
  smaLong: number;
  monthlyAmount: number;
};

export type BacktestMetrics = {
  totalReturnPercent: number;
  cagrPercent: number;
  maxDrawdownPercent: number;
  volatilityPercent: number;
  sharpe: number;
  winRatePercent: number;
  tradeCount: number;
};

export type EquityPoint = { date: string; strategy: number; benchmark: number };

export type BacktestResult = {
  symbol: string;
  name: string;
  market: "TW" | "US";
  strategy: BacktestStrategy;
  strategyLabel: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalValue: number;
  metrics: BacktestMetrics;
  benchmark: BacktestMetrics;
  equity: EquityPoint[];
  summary: string;
  source: string;
  updatedAt: string;
};

export type ScreenerMarket = "TW" | "US" | "ALL";

export type ScreenerRequestInput = {
  market: ScreenerMarket;
  minFundamental: number;
  minChip: number;
  maxPer: number | null;
  minDividendYield: number | null;
  sortBy: "total" | "fundamental" | "chip" | "dividendYield";
};

export type ScreenerRow = {
  symbol: string;
  name: string;
  market: "TW" | "US";
  totalScore: number;
  fundamentalScore: number;
  chipScore: number | null;
  per: number | null;
  dividendYield: number | null;
  revenueYoyPercent: number | null;
};

export type ScreenerResult = {
  rows: ScreenerRow[];
  count: number;
  universeSize: number;
  market: ScreenerMarket;
  updatedAt: string;
  notes: string[];
};

export type MarketChatResponse = {
  answer: string;
  source: "openai" | "groq" | "local";
  model: string | null;
  updatedAt: string;
};
