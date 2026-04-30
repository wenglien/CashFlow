import { AlertTriangle, CheckCircle2, ShieldCheck, TrendingUp } from "lucide-react";
import type { SimulationResult } from "@/lib/types";

const percent = new Intl.NumberFormat("zh-TW", {
  style: "percent",
  maximumFractionDigits: 1
});

const money = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0
});

function formatNTD(value: number) {
  return `NT$${money.format(value)}`;
}

function riskTone(risk: "低" | "中" | "高") {
  if (risk === "低") return "bg-mint/35 text-pine";
  if (risk === "中") return "bg-gold/20 text-ink";
  return "bg-coral/15 text-coral";
}

export function InvestmentRecommendations({ result }: { result: SimulationResult }) {
  const diagnostics = result.diagnostics;

  return (
    <section className="grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-pine">整體投資模擬</p>
          <h2 className="mt-1 text-xl font-semibold">建議投資清單與預期回報</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">{diagnostics.recommendationSummary}</p>
        </div>
        <div className="rounded-lg bg-mist px-4 py-3 text-right">
          <p className="text-xs font-semibold text-ink/50">組合風險分數</p>
          <p className="mt-1 text-2xl font-semibold">{diagnostics.riskScore}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg bg-mist p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink/60">
            <TrendingUp size={16} className="text-pine" />
            預期年化回報
          </div>
          <p className="mt-2 text-2xl font-semibold">{percent.format(diagnostics.expectedAnnualReturn)}</p>
        </div>
        <div className="rounded-lg bg-mist p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink/60">
            <ShieldCheck size={16} className="text-pine" />
            預期股息率
          </div>
          <p className="mt-2 text-2xl font-semibold">{percent.format(diagnostics.expectedDividendYield)}</p>
        </div>
        <div className="rounded-lg bg-mist p-4">
          <p className="text-sm font-semibold text-ink/60">預期年收入</p>
          <p className="mt-2 text-2xl font-semibold">{formatNTD(diagnostics.expectedAnnualIncome)}</p>
        </div>
        <div className="rounded-lg bg-mist p-4">
          <p className="text-sm font-semibold text-ink/60">目標提領率</p>
          <p className="mt-2 text-2xl font-semibold">{percent.format(diagnostics.withdrawalRate)}</p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {result.candidates.map((candidate) => (
          <article key={candidate.symbol} className="grid gap-3 rounded-lg border border-ink/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{candidate.symbol}</h3>
                  <span className="rounded-md bg-mist px-2 py-1 text-xs font-semibold text-ink/55">{candidate.category}</span>
                </div>
                <p className="mt-1 text-sm text-ink/55">{candidate.name}</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${riskTone(candidate.riskLabel)}`}>風險 {candidate.riskLabel}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="rounded-md bg-mist p-2">
                <p className="text-xs text-ink/45">配置</p>
                <p className="mt-1 font-semibold">{candidate.allocationPercent}%</p>
              </div>
              <div className="rounded-md bg-mist p-2">
                <p className="text-xs text-ink/45">年化</p>
                <p className="mt-1 font-semibold">{percent.format(candidate.expectedAnnualReturn)}</p>
              </div>
              <div className="rounded-md bg-mist p-2">
                <p className="text-xs text-ink/45">股息</p>
                <p className="mt-1 font-semibold">{percent.format(candidate.dividendYield)}</p>
              </div>
              <div className="rounded-md bg-mist p-2">
                <p className="text-xs text-ink/45">波動</p>
                <p className="mt-1 font-semibold">{percent.format(candidate.volatility)}</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-ink/65">{candidate.rationale}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-2 rounded-lg bg-ink p-4 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold text-mint">
          <CheckCircle2 size={16} />
          執行重點
        </div>
        {diagnostics.actionPlan.map((item) => (
          <p key={item} className="text-sm leading-6 text-white/75">
            {item}
          </p>
        ))}
        <div className="mt-2 flex items-start gap-2 rounded-md bg-white/10 p-3 text-xs leading-5 text-white/70">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-gold" />
          以上為教育用途的模型輸出，不是個人化買賣指令；實際投入前仍需搭配自身現金流、稅務與風險承受度。
        </div>
      </div>
    </section>
  );
}
