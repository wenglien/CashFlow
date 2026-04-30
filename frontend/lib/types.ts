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

export type MarketChatResponse = {
  answer: string;
  source: "openai" | "groq" | "local";
  model: string | null;
  updatedAt: string;
};
