import { CashFlowChart } from "@/components/CashFlowChart";
import { GrowthChart } from "@/components/GrowthChart";
import { PortfolioChart } from "@/components/PortfolioChart";
import { ResultSummary } from "@/components/ResultSummary";
import type { SimulationResult } from "@/lib/types";

const sample: SimulationResult = {
  averageMonthlyIncome: 2700,
  successRate: 0.82,
  projectedFinalValue: 1820000,
  worstCaseValue: 420000,
  maxDrawdown: 0.31,
  assets: [
    { assetName: "台股市值型 ETF", allocationPercent: 30, expectedReturn: 0.075, dividendYield: 0.02, volatility: 0.17 },
    { assetName: "台股高股息 ETF", allocationPercent: 30, expectedReturn: 0.06, dividendYield: 0.052, volatility: 0.13 },
    { assetName: "台股科技龍頭", allocationPercent: 10, expectedReturn: 0.09, dividendYield: 0.018, volatility: 0.22 },
    { assetName: "美國科技股衛星", allocationPercent: 10, expectedReturn: 0.1, dividendYield: 0.004, volatility: 0.28 },
    { assetName: "台幣債券／貨幣基金", allocationPercent: 10, expectedReturn: 0.025, dividendYield: 0.02, volatility: 0.04 },
    { assetName: "現金", allocationPercent: 10, expectedReturn: 0.012, dividendYield: 0.008, volatility: 0.01 }
  ],
  diagnostics: {
    expectedAnnualReturn: 0.06,
    expectedDividendYield: 0.027,
    expectedAnnualIncome: 26600,
    withdrawalRate: 0.048,
    riskScore: 47,
    incomeCoverage: 0.56,
    recommendationSummary: "目前組合具備可行性，但目標收入或波動仍有壓力，建議分批投入並保留防禦資產。",
    actionPlan: [
      "以 0050 或 006208 建立台股市值型核心部位。",
      "用 0056、00878 或 00929 補足台幣股息現金流。",
      "用 2330、2454 或 2308 小比例補足科技龍頭曝險。",
      "用 AAPL、MSFT 或 NVDA 小比例納入美國科技股衛星配置。",
      "保留台幣債券、貨幣基金與現金以降低回撤。"
    ]
  },
  candidates: [
    {
      symbol: "0050.TW",
      name: "元大台灣卓越50 ETF",
      category: "市值型核心",
      allocationPercent: 35,
      expectedAnnualReturn: 0.075,
      dividendYield: 0.018,
      volatility: 0.17,
      riskLabel: "中",
      rationale: "作為台股核心成長來源，追蹤大型權值股整體表現。"
    }
  ],
  growth: Array.from({ length: 21 }, (_, year) => ({
    year,
    p5: 1000000 + year * 6000,
    median: 1000000 + year * 42000,
    p95: 1000000 + year * 93000
  }))
};

export default function DashboardPage() {
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">儀表板</h1>
        <p className="mt-2 text-ink/65">均衡型台美科技與現金流配置的分析快照。</p>
      </div>
      <ResultSummary result={sample} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold">資產成長預測</h2>
          <GrowthChart data={sample.growth} />
        </section>
        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold">資產配置</h2>
          <PortfolioChart assets={sample.assets} />
        </section>
      </div>
      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold">收益來源</h2>
        <CashFlowChart assets={sample.assets} capital={1000000} />
      </section>
    </main>
  );
}
