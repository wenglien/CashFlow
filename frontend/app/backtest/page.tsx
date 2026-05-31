"use client";

import { useState } from "react";
import { Activity, Play } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, PageHeader } from "@/components/ui";
import { runBacktest } from "@/lib/api";
import type { BacktestMetrics, BacktestRequestInput, BacktestResult, BacktestStrategy } from "@/lib/types";

const strategies: { key: BacktestStrategy; label: string; desc: string }[] = [
  { key: "buy_and_hold", label: "買進持有", desc: "一次買進並持有到期末" },
  { key: "sma_cross", label: "均線交叉", desc: "短均線 > 長均線做多,反之空手" },
  { key: "dca", label: "定期定額", desc: "每月固定金額分批買進" }
];

function fmtMoney(v: number): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function MetricCell({ label, value, tone }: { label: string; value: string; tone?: "pine" | "coral" }) {
  const color = tone === "pine" ? "text-pine" : tone === "coral" ? "text-coral" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium text-slate">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular ${color}`}>{value}</p>
    </div>
  );
}

type Metric = { label: string; value: string; tone?: "pine" | "coral" };

function metricsRow(m: BacktestMetrics): Metric[] {
  return [
    { label: "總報酬", value: `${m.totalReturnPercent >= 0 ? "+" : ""}${m.totalReturnPercent}%`, tone: m.totalReturnPercent >= 0 ? "pine" : "coral" },
    { label: "年化 (CAGR)", value: `${m.cagrPercent}%`, tone: m.cagrPercent >= 0 ? "pine" : "coral" },
    { label: "最大回撤", value: `${m.maxDrawdownPercent}%`, tone: "coral" },
    { label: "年化波動", value: `${m.volatilityPercent}%` },
    { label: "夏普值", value: `${m.sharpe}`, tone: m.sharpe >= 1 ? "pine" : undefined },
    { label: "月勝率", value: `${m.winRatePercent}%` }
  ];
}

export default function BacktestPage() {
  const [form, setForm] = useState<BacktestRequestInput>({
    symbol: "2330",
    strategy: "buy_and_hold",
    years: 5,
    initialCapital: 1000000,
    smaShort: 20,
    smaLong: 60,
    monthlyAmount: 10000
  });
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof BacktestRequestInput>(key: K, value: BacktestRequestInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.symbol.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      setResult(await runBacktest({ ...form, symbol: form.symbol.trim() }));
    } catch {
      setError("回測失敗,請確認代號正確且有足夠歷史資料,稍後再試。");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="量化 · 策略回測"
        title="歷史回測"
        description="用真實歷史日線測試策略績效,並與買進持有基準比較。未計交易成本與滑價。"
      />

      <form onSubmit={submit}>
        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate">股票代號</span>
              <input
                value={form.symbol}
                onChange={(e) => update("symbol", e.target.value)}
                placeholder="2330 或 AAPL"
                className="h-11 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:shadow-focus"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate">回測期間</span>
              <select
                value={form.years}
                onChange={(e) => update("years", Number(e.target.value))}
                className="h-11 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:shadow-focus"
              >
                {[1, 2, 3, 5, 7, 10].map((y) => (
                  <option key={y} value={y}>
                    近 {y} 年
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-pine px-6 text-sm font-semibold text-white transition hover:bg-pine-dark disabled:opacity-60"
            >
              {isLoading ? <Activity size={16} className="animate-pulse" /> : <Play size={16} />}
              {isLoading ? "回測中..." : "執行回測"}
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            <span className="text-xs font-medium text-slate">策略</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {strategies.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => update("strategy", s.key)}
                  className={`rounded-xl border p-3 text-left transition ${
                    form.strategy === s.key ? "border-pine bg-pine-soft" : "border-line bg-surface hover:bg-mist"
                  }`}
                >
                  <p className={`text-sm font-semibold ${form.strategy === s.key ? "text-pine" : "text-ink"}`}>{s.label}</p>
                  <p className="mt-0.5 text-xs text-slate">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {form.strategy === "sma_cross" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate">短均線(日)</span>
                <input type="number" min={2} max={120} value={form.smaShort} onChange={(e) => update("smaShort", Number(e.target.value))} className="h-11 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:shadow-focus" />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate">長均線(日)</span>
                <input type="number" min={5} max={250} value={form.smaLong} onChange={(e) => update("smaLong", Number(e.target.value))} className="h-11 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:shadow-focus" />
              </label>
            </div>
          ) : null}
          {form.strategy === "dca" ? (
            <label className="mt-4 grid max-w-xs gap-1.5">
              <span className="text-xs font-medium text-slate">每月投入金額</span>
              <input type="number" min={1000} step={1000} value={form.monthlyAmount} onChange={(e) => update("monthlyAmount", Number(e.target.value))} className="h-11 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:shadow-focus" />
            </label>
          ) : null}
        </Card>
      </form>

      {error ? (
        <div className="rounded-xl border border-coral/30 bg-coral-soft p-4 text-sm font-medium text-coral">{error}</div>
      ) : null}

      {result ? (
        <div className="grid gap-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-ink">{result.name}</h2>
                <span className="rounded-md bg-mist px-2 py-0.5 text-xs font-semibold text-slate tabular">{result.symbol}</span>
                <span className="rounded-md bg-pine-soft px-2 py-0.5 text-xs font-semibold text-pine">{result.strategyLabel}</span>
              </div>
              <p className="text-sm text-slate tabular">
                {result.startDate} ~ {result.endDate}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-8 gap-y-2">
              <div>
                <p className="text-xs text-slate">初始投入</p>
                <p className="text-lg font-semibold text-ink tabular">{fmtMoney(result.initialCapital)}</p>
              </div>
              <div>
                <p className="text-xs text-slate">期末價值</p>
                <p className="text-lg font-semibold text-pine tabular">{fmtMoney(result.finalValue)}</p>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-mist/60 p-3 text-sm leading-relaxed text-slate">{result.summary}</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-slate">權益曲線(策略 vs 買進持有基準)</h3>
            <div className="mt-3 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.equity} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e4" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5a6b63" }} interval={Math.max(0, Math.floor(result.equity.length / 8))} />
                  <YAxis tick={{ fontSize: 11, fill: "#5a6b63" }} width={64} tickFormatter={(v) => fmtMoney(v)} />
                  <Tooltip formatter={(v: number) => fmtMoney(v)} labelStyle={{ color: "#13201b" }} />
                  <Line dataKey="strategy" name="策略" stroke="#157a5b" strokeWidth={2.2} dot={false} isAnimationActive={false} />
                  <Line dataKey="benchmark" name="買進持有" stroke="#cf9b32" strokeWidth={1.8} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-pine">策略績效</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {metricsRow(result.metrics).map((m) => (
                  <MetricCell key={m.label} label={m.label} value={m.value} tone={m.tone} />
                ))}
              </div>
              {result.strategy === "sma_cross" ? (
                <p className="mt-3 text-xs text-slate">共 {result.metrics.tradeCount} 次進出訊號。</p>
              ) : null}
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate">買進持有基準</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {metricsRow(result.benchmark).map((m) => (
                  <MetricCell key={m.label} label={m.label} value={m.value} />
                ))}
              </div>
            </Card>
          </div>

          <p className="text-center text-xs text-slate/70">
            資料來源:{result.source} · 回測未計交易成本與滑價,過往績效不代表未來表現,非投資建議。
          </p>
        </div>
      ) : !error && !isLoading ? (
        <div className="grid min-h-[200px] place-items-center rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-slate">
          選擇代號與策略,執行回測檢視歷史績效。
        </div>
      ) : null}
    </main>
  );
}
