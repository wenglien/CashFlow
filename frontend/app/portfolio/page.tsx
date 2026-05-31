import { PortfolioChart } from "@/components/PortfolioChart";
import { Card, PageHeader } from "@/components/ui";
import type { AssetAllocation } from "@/lib/types";

const profiles: { title: string; assets: AssetAllocation[] }[] = [
  {
    title: "保守型",
    assets: [
      { assetName: "債券 ETF", allocationPercent: 50, expectedReturn: 0.035, dividendYield: 0.03, volatility: 0.06 },
      { assetName: "台股高股息 ETF", allocationPercent: 25, expectedReturn: 0.06, dividendYield: 0.04, volatility: 0.13 },
      { assetName: "台股市值型 ETF", allocationPercent: 15, expectedReturn: 0.075, dividendYield: 0.018, volatility: 0.16 },
      { assetName: "現金", allocationPercent: 10, expectedReturn: 0.015, dividendYield: 0.01, volatility: 0.01 }
    ]
  },
  {
    title: "均衡型",
    assets: [
      { assetName: "台股市值型 ETF", allocationPercent: 30, expectedReturn: 0.075, dividendYield: 0.018, volatility: 0.16 },
      { assetName: "台股高股息 ETF", allocationPercent: 30, expectedReturn: 0.06, dividendYield: 0.04, volatility: 0.13 },
      { assetName: "台股科技龍頭", allocationPercent: 10, expectedReturn: 0.09, dividendYield: 0.018, volatility: 0.22 },
      { assetName: "美國科技股衛星", allocationPercent: 10, expectedReturn: 0.1, dividendYield: 0.004, volatility: 0.28 },
      { assetName: "債券 ETF", allocationPercent: 10, expectedReturn: 0.035, dividendYield: 0.03, volatility: 0.06 },
      { assetName: "現金", allocationPercent: 10, expectedReturn: 0.015, dividendYield: 0.01, volatility: 0.01 }
    ]
  },
  {
    title: "積極型",
    assets: [
      { assetName: "台股科技成長 ETF", allocationPercent: 30, expectedReturn: 0.095, dividendYield: 0.008, volatility: 0.23 },
      { assetName: "台股市值型 ETF", allocationPercent: 25, expectedReturn: 0.075, dividendYield: 0.018, volatility: 0.16 },
      { assetName: "美國科技股衛星", allocationPercent: 20, expectedReturn: 0.11, dividendYield: 0.004, volatility: 0.3 },
      { assetName: "台股高股息 ETF", allocationPercent: 15, expectedReturn: 0.06, dividendYield: 0.04, volatility: 0.13 },
      { assetName: "債券 ETF", allocationPercent: 10, expectedReturn: 0.035, dividendYield: 0.03, volatility: 0.06 }
    ]
  }
];

export default function PortfolioPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="資產配置"
        title="投資組合建構器"
        description="依照風險偏好,把新手也能理解的選擇轉換成多元化資產配置模板。"
      />
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {profiles.map((profile) => (
          <Card key={profile.title} className="p-5">
            <h2 className="text-lg font-semibold text-ink">{profile.title}</h2>
            <PortfolioChart assets={profile.assets} />
            <div className="mt-2 grid gap-2">
              {profile.assets.map((asset) => (
                <div key={asset.assetName} className="flex items-center justify-between rounded-lg bg-mist px-3 py-2 text-sm">
                  <span className="text-slate">{asset.assetName}</span>
                  <span className="font-semibold text-ink tabular">{asset.allocationPercent}%</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
