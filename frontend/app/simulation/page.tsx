"use client";

import { useState } from "react";
import { CashFlowChart } from "@/components/CashFlowChart";
import { GrowthChart } from "@/components/GrowthChart";
import { InputForm } from "@/components/InputForm";
import { InvestmentRecommendations } from "@/components/InvestmentRecommendations";
import { MarketDashboard } from "@/components/MarketDashboard";
import { PortfolioChart } from "@/components/PortfolioChart";
import { ResultSummary } from "@/components/ResultSummary";
import { runSimulation } from "@/lib/api";
import type { PortfolioInput, SimulationResult } from "@/lib/types";

const initialPortfolio: PortfolioInput = {
  totalCapital: 1000000,
  targetMonthlyIncome: 4000,
  investmentYears: 20,
  riskLevel: "balanced",
  currency: "TWD"
};

export default function SimulationPage() {
  const [portfolio, setPortfolio] = useState(initialPortfolio);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submit() {
    setIsLoading(true);
    setError(null);
    try {
      setResult(await runSimulation(portfolio));
    } catch {
      setError("請確認 FastAPI 後端已在 8000 埠啟動，然後重新執行模擬。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <MarketDashboard />

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <InputForm value={portfolio} onChange={setPortfolio} onSubmit={submit} isLoading={isLoading} />
        </aside>

        <div className="grid gap-6">
          {error ? <div className="rounded-xl border border-coral/30 bg-coral-soft p-4 text-sm font-medium text-coral">{error}</div> : null}
          {result ? (
            <>
              <ResultSummary result={result} />
              <InvestmentRecommendations result={result} />
              <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                  <h2 className="text-lg font-semibold text-ink">投資組合區間</h2>
                  <GrowthChart data={result.growth} />
                </div>
                <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                  <h2 className="text-lg font-semibold text-ink">資產配置</h2>
                  <PortfolioChart assets={result.assets} />
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                <h2 className="text-lg font-semibold text-ink">預估每月收入</h2>
                <CashFlowChart assets={result.assets} capital={portfolio.totalCapital} />
              </div>
            </>
          ) : (
            <div className="grid gap-4 rounded-2xl border border-line bg-surface p-6 shadow-card">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">尚未執行模擬</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">準備進行現金流檢查</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate">
                  先選擇市場標的,再設定本金、收入目標、年限與風險等級。模型會輸出成功率、最大回撤、建議配置與預期回報。
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {["台股 ETF 與科技股", "美國大型科技股", "Monte Carlo 壓力測試"].map((item) => (
                  <div key={item} className="rounded-xl bg-mist p-4 text-sm font-semibold text-slate">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
