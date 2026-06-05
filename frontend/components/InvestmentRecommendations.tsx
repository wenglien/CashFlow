import { AlertTriangle, Bot, CheckCircle2, PieChart, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
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

function signalTone(signal: SimulationResult["aiInsight"]["systemSignal"]) {
  if (signal === "可執行") return "bg-mint/35 text-pine";
  if (signal === "需調整") return "bg-gold/20 text-ink";
  return "bg-coral/15 text-coral";
}

function roleTone(role: string) {
  if (role === "防守與流動性") return "bg-mint/35 text-pine";
  if (role === "衛星成長") return "bg-coral/15 text-coral";
  return "bg-gold/20 text-ink";
}

export function InvestmentRecommendations({ result }: { result: SimulationResult }) {
  const diagnostics = result.diagnostics;

  return (
    <section className="grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-pine">系統量化 + AI 綜合建議</p>
          <h2 className="mt-1 text-xl font-semibold">投資組合配置建議</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">{diagnostics.recommendationSummary}</p>
        </div>
        <div className="rounded-lg bg-mist px-4 py-3 text-right">
          <p className="text-xs font-semibold text-ink/50">組合風險分數</p>
          <p className="mt-1 text-2xl font-semibold">{diagnostics.riskScore}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-pine/20 bg-mint/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-pine text-white">
              <Bot size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-pine">AI 綜合解讀</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">{result.aiInsight.headline}</h3>
            </div>
          </div>
          <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${signalTone(result.aiInsight.systemSignal)}`}>
            {result.aiInsight.systemSignal}
          </span>
        </div>
        <p className="text-sm leading-6 text-ink/70">{result.aiInsight.aiSummary}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-white/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-pine">配置建議</p>
            <div className="mt-2 grid gap-2">
              {result.aiInsight.allocationGuidance.map((item) => (
                <p key={item} className="text-sm leading-6 text-ink/65">{item}</p>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-white/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-coral">風險提醒</p>
            <div className="mt-2 grid gap-2">
              {result.aiInsight.riskWarnings.map((item) => (
                <p key={item} className="text-sm leading-6 text-ink/65">{item}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-ink/10 bg-mist p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-pine">
              <PieChart size={16} />
              建議配置藍圖
            </div>
            <p className="mt-1 text-sm leading-6 text-ink/60">依你的本金換算成金額，先建立核心，再配置衛星與防守部位。</p>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-ink/60">
            <Wallet size={15} className="text-pine" />
            合計 100%
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {diagnostics.portfolioBlueprint.map((item) => (
            <article key={`${item.title}-${item.allocationPercent}`} className="grid gap-3 rounded-lg bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${roleTone(item.role)}`}>{item.role}</span>
                  <h3 className="mt-2 text-base font-semibold text-ink">{item.title}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-ink">{item.allocationPercent}%</p>
                  <p className="text-xs font-semibold text-ink/45">{formatNTD(item.amount)}</p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-mist">
                <div className="h-full rounded-full bg-pine" style={{ width: `${item.allocationPercent}%` }} />
              </div>
              <p className="text-sm leading-6 text-ink/65">{item.guidance}</p>
              {item.symbols.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {item.symbols.map((symbol) => (
                    <span key={symbol} className="rounded-md bg-mist px-2 py-1 text-xs font-semibold text-ink/55">
                      {symbol}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
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
