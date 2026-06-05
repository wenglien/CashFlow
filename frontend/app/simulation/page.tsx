"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Bot, CheckCircle2, ListChecks, SlidersHorizontal } from "lucide-react";
import { CashFlowChart } from "@/components/CashFlowChart";
import { GrowthChart } from "@/components/GrowthChart";
import { InputForm } from "@/components/InputForm";
import { InvestmentRecommendations } from "@/components/InvestmentRecommendations";
import { MarketDashboard } from "@/components/MarketDashboard";
import { PortfolioChart } from "@/components/PortfolioChart";
import { ResultSummary } from "@/components/ResultSummary";
import { runSimulation } from "@/lib/api";
import { DEFAULT_SELECTED_SYMBOLS } from "@/lib/marketOptions";
import type { PortfolioInput, SimulationResult } from "@/lib/types";

const initialPortfolio: PortfolioInput = {
  totalCapital: 1000000,
  targetMonthlyIncome: 4000,
  investmentYears: 20,
  riskLevel: "balanced",
  currency: "TWD"
};

const aiPresetPortfolios: Record<string, PortfolioInput> = {
  conservative: { totalCapital: 300000, targetMonthlyIncome: 1000, investmentYears: 15, riskLevel: "conservative", currency: "TWD" },
  balanced: initialPortfolio,
  aggressive: { totalCapital: 1500000, targetMonthlyIncome: 6000, investmentYears: 25, riskLevel: "aggressive", currency: "TWD" }
};

const flowSteps = [
  { label: "市場池", input: "ETF、台股、美股或自選代號", output: "候選標的清單", icon: ListChecks },
  { label: "投資假設", input: "本金、收入目標、年限、風險", output: "提領率與壓力狀態", icon: SlidersHorizontal },
  { label: "量化模型", input: "配置模板與候選標的", output: "成功率、回撤、收入覆蓋", icon: BarChart3 },
  { label: "配置結論", input: "模擬指標與風險訊號", output: "配置藍圖與執行重點", icon: Bot }
];

const riskLabels: Record<PortfolioInput["riskLevel"], string> = {
  conservative: "保守型",
  balanced: "均衡型",
  aggressive: "積極型"
};

const money = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0
});

type CashFlowWindow = Window & {
  __cashflowPageState?: Record<string, unknown>;
};

export default function SimulationPage() {
  const [portfolio, setPortfolio] = useState(initialPortfolio);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [marketSymbols, setMarketSymbols] = useState<string[]>(DEFAULT_SELECTED_SYMBOLS);
  const hasAssumptions = portfolio.totalCapital > 0 && portfolio.investmentYears > 0;
  const activeStep = result ? 3 : isLoading ? 2 : marketSymbols.length > 0 && hasAssumptions ? 2 : marketSymbols.length > 0 ? 1 : 0;
  const annualIncomeTarget = portfolio.targetMonthlyIncome * 12;
  const flowStatus = result ? "配置結論已產生" : isLoading ? "量化模型運算中" : activeStep === 2 ? "等待執行模型" : activeStep === 1 ? "投資假設檢查中" : "市場池整理中";

  const submit = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setResult(await runSimulation(portfolio, marketSymbols));
    } catch {
      setError("請確認 FastAPI 後端已在 8000 埠啟動，然後重新執行模擬。");
    } finally {
      setIsLoading(false);
    }
  }, [marketSymbols, portfolio]);

  useEffect(() => {
    function applyPreset(event: Event) {
      const detail = (event as CustomEvent<{ preset?: string }>).detail;
      const nextPortfolio = detail?.preset ? aiPresetPortfolios[detail.preset] : null;
      if (nextPortfolio) {
        setPortfolio(nextPortfolio);
      }
    }

    function runFromAi() {
      submit();
    }

    window.addEventListener("cashflow:apply-simulation-preset", applyPreset);
    window.addEventListener("cashflow:run-simulation", runFromAi);
    return () => {
      window.removeEventListener("cashflow:apply-simulation-preset", applyPreset);
      window.removeEventListener("cashflow:run-simulation", runFromAi);
    };
  }, [submit]);

  useEffect(() => {
    const nextPageState: Record<string, unknown> = {
      page: "simulation",
      flowStatus,
      activeStep: activeStep + 1,
      marketSymbols,
      portfolioInput: {
        totalCapital: portfolio.totalCapital,
        targetMonthlyIncome: portfolio.targetMonthlyIncome,
        annualIncomeTarget,
        investmentYears: portfolio.investmentYears,
        riskLevel: portfolio.riskLevel,
        riskLabel: riskLabels[portfolio.riskLevel],
        currency: portfolio.currency
      },
      simulationState: {
        isLoading,
        hasResult: Boolean(result),
        error
      }
    };

    if (result) {
      nextPageState.simulationResult = {
        summary: {
          averageMonthlyIncome: result.averageMonthlyIncome,
          successRate: result.successRate,
          projectedFinalValue: result.projectedFinalValue,
          worstCaseValue: result.worstCaseValue,
          maxDrawdown: result.maxDrawdown
        },
        diagnostics: result.diagnostics,
        aiInsight: result.aiInsight,
        assets: result.assets,
        candidates: result.candidates.slice(0, 8)
      };
    }

    (window as CashFlowWindow).__cashflowPageState = nextPageState;
    return () => {
      delete (window as CashFlowWindow).__cashflowPageState;
    };
  }, [activeStep, annualIncomeTarget, error, flowStatus, isLoading, marketSymbols, portfolio, result]);

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <section className="grid gap-5 rounded-lg border border-ink/10 bg-white p-4 shadow-panel sm:p-5" data-ai-context>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-pine">現金流決策流程</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">從市場清單到 AI 配置建議</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
              系統把輸入拆成市場池與投資假設，再輸出量化壓力測試、AI 解讀與可執行的配置藍圖。
            </p>
          </div>
          <div className="grid min-w-[180px] gap-1 rounded-md bg-mist px-3 py-2 text-sm">
            <span className="text-xs font-semibold text-ink/45">目前流程狀態</span>
            <span className="font-semibold text-ink">{flowStatus}</span>
          </div>
        </div>

        <div className="grid gap-2 rounded-lg bg-mist p-3 text-sm text-ink/60 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-ink/40">市場池</p>
            <p className="mt-1 font-semibold text-ink">{marketSymbols.length} 檔標的</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ink/40">現金流目標</p>
            <p className="mt-1 font-semibold text-ink">年化 NT${money.format(annualIncomeTarget)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ink/40">風險設定</p>
            <p className="mt-1 font-semibold text-ink">{riskLabels[portfolio.riskLevel]} · {portfolio.investmentYears} 年</p>
          </div>
        </div>

        <ol className="grid gap-0 overflow-hidden rounded-lg border border-line bg-white md:grid-cols-4">
          {flowSteps.map((step, index) => {
            const status = result || index < activeStep ? "完成" : index === activeStep ? "目前" : "等待";
            const isDone = status === "完成";
            const isCurrent = status === "目前";
            return (
              <li key={step.label} className={`relative grid gap-3 border-line p-4 md:border-r md:last:border-r-0 ${isCurrent ? "bg-mint/20" : isDone ? "bg-white" : "bg-mist/45"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`grid h-8 w-8 place-items-center rounded-md ${isDone || isCurrent ? "bg-pine text-white" : "bg-white text-ink/40"}`}>
                      <step.icon size={16} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-ink/40">Step {index + 1}</p>
                      <p className="font-semibold text-ink">{step.label}</p>
                    </div>
                  </div>
                  {isDone ? <CheckCircle2 size={16} className="text-pine" /> : <span className={`rounded-md px-2 py-1 text-xs font-semibold ${isCurrent ? "bg-pine text-white" : "bg-white text-ink/40"}`}>{status}</span>}
                </div>
                <div className="grid gap-2 text-xs leading-5">
                  <p><span className="font-semibold text-ink/45">輸入</span><br /><span className="text-ink/65">{step.input}</span></p>
                  <p><span className="font-semibold text-ink/45">輸出</span><br /><span className="text-ink/65">{step.output}</span></p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <MarketDashboard onSelectionChange={setMarketSymbols} />

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <InputForm value={portfolio} onChange={setPortfolio} onSubmit={submit} isLoading={isLoading} />
        </aside>

        <div className="grid gap-6">
          {error ? <div className="rounded-xl border border-coral/30 bg-coral-soft p-4 text-sm font-medium text-coral">{error}</div> : null}
          {isLoading ? (
            <div className="grid gap-4 rounded-2xl border border-line bg-surface p-6 shadow-card">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">系統模擬 + AI 解讀</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">正在產生建議</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate">
                  系統正在跑 Monte Carlo 壓力測試，接著整理候選標的、股息覆蓋、最大回撤與 AI 風險提醒。
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {["量化成功率", "候選配置", "AI 綜合建議"].map((item) => (
                  <div key={item} className="grid gap-3 rounded-xl bg-mist p-4">
                    <div className="h-4 w-24 rounded-full bg-ink/10" />
                    <div className="h-8 rounded-md bg-ink/10" />
                    <p className="text-sm font-semibold text-slate">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : result ? (
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
                  先選擇市場標的,再設定本金、收入目標、年限與風險等級。系統會把你選的標的納入候選清單，輸出成功率、最大回撤、AI 綜合解讀與風險提醒。
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
