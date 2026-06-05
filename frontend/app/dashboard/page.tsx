import { CashFlowChart } from "@/components/CashFlowChart";
import { GrowthChart } from "@/components/GrowthChart";
import { PortfolioChart } from "@/components/PortfolioChart";
import { ResultSummary } from "@/components/ResultSummary";
import { Card, PageHeader } from "@/components/ui";
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
    ],
    portfolioBlueprint: [
      {
        title: "台股市值型 ETF",
        role: "核心配置",
        allocationPercent: 30,
        amount: 300000,
        guidance: "作為長期核心，適合分批投入並定期再平衡，避免短線行情改變整體策略。",
        symbols: ["0050.TW", "006208.TW"]
      },
      {
        title: "台股高股息 ETF",
        role: "核心配置",
        allocationPercent: 30,
        amount: 300000,
        guidance: "用來補強每月現金流，但不要只追高配息；仍要搭配市值型 ETF 分散來源。",
        symbols: ["00878.TW", "0056.TW"]
      },
      {
        title: "台股科技龍頭",
        role: "衛星成長",
        allocationPercent: 10,
        amount: 100000,
        guidance: "用小比例追求成長，單一個股或題材不要超過整體組合的衛星配置。",
        symbols: ["2330.TW"]
      },
      {
        title: "美國科技股衛星",
        role: "衛星成長",
        allocationPercent: 10,
        amount: 100000,
        guidance: "用小比例追求成長，單一個股或題材不要超過整體組合的衛星配置。",
        symbols: ["NVDA", "MSFT"]
      },
      {
        title: "台幣債券／貨幣基金",
        role: "防守與流動性",
        allocationPercent: 10,
        amount: 100000,
        guidance: "放在低波動工具，降低整體回撤；若風險分數偏高，可優先從衛星部位挪一部分到這裡。",
        symbols: ["00679B.TW"]
      },
      {
        title: "現金",
        role: "防守與流動性",
        allocationPercent: 10,
        amount: 100000,
        guidance: "保留可動用資金，遇到回撤時先用現金緩衝，不急著賣出核心部位。",
        symbols: []
      }
    ]
  },
  aiInsight: {
    headline: "系統模型顯示可作為基準配置，但 AI 建議補強現金流覆蓋",
    systemSignal: "需調整",
    aiSummary: "成功率接近可接受區間，但股息覆蓋率仍偏低。AI 建議以市值型 ETF 作核心，搭配高股息 ETF 與防守資產降低提領壓力。",
    allocationGuidance: [
      "先以 0050 或 006208 建立核心，再用 00878、0056 補足台幣現金流。",
      "科技個股與美股衛星應維持小比例，避免單一題材主導回撤。",
    ],
    riskWarnings: [
      "若目標月收入維持不變，需要定期檢查股息覆蓋率。",
      "最大回撤壓力仍需預留現金或債券緩衝。",
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
      <PageHeader eyebrow="範例組合" title="儀表板" description="均衡型台美科技與現金流配置的分析快照。" />
      <ResultSummary result={sample} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-ink">資產成長預測</h2>
          <GrowthChart data={sample.growth} />
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-ink">資產配置</h2>
          <PortfolioChart assets={sample.assets} />
        </Card>
      </div>
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-ink">收益來源</h2>
        <CashFlowChart assets={sample.assets} capital={1000000} />
      </Card>
    </main>
  );
}
