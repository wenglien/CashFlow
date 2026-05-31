"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Filter, SlidersHorizontal } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { runScreener } from "@/lib/api";
import { scoreColor } from "@/lib/score";
import type { ScreenerRequestInput, ScreenerResult, ScreenerRow } from "@/lib/types";

const markets: { key: ScreenerRequestInput["market"]; label: string }[] = [
  { key: "TW", label: "台股" },
  { key: "US", label: "美股" },
  { key: "ALL", label: "全部" }
];

const sortOptions: { key: ScreenerRequestInput["sortBy"]; label: string }[] = [
  { key: "total", label: "綜合評分" },
  { key: "fundamental", label: "基本面" },
  { key: "chip", label: "籌碼面" },
  { key: "dividendYield", label: "殖利率" }
];

function ScorePill({ score }: { score: number }) {
  const t = scoreColor(score);
  return (
    <span className="inline-flex h-7 w-9 items-center justify-center rounded-lg text-sm font-bold tabular" style={{ color: t, backgroundColor: `${t}1f` }}>
      {score}
    </span>
  );
}

function fmt(v: number | null, suffix = ""): string {
  if (v === null || v === undefined) return "—";
  return `${v}${suffix}`;
}

export default function ScreenerPage() {
  const [form, setForm] = useState<ScreenerRequestInput>({
    market: "TW",
    minFundamental: 0,
    minChip: 0,
    maxPer: null,
    minDividendYield: null,
    sortBy: "total"
  });
  const [result, setResult] = useState<ScreenerResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ScreenerRequestInput>(key: K, value: ScreenerRequestInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      setResult(await runScreener(form));
    } catch {
      setError("選股失敗,可能是免費資料額度或網路問題,稍後再試。");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="量化 · 選股器"
        title="條件選股"
        description="對精選股票池跑基本面(台股加計籌碼面)評分,依你的條件篩選與排序。"
      />

      <form onSubmit={submit}>
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal size={16} className="text-pine" />
            <span className="text-sm font-semibold text-ink">市場</span>
            <div className="flex gap-1">
              {markets.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => update("market", m.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    form.market === m.key ? "bg-pine text-white" : "bg-mist text-slate hover:text-ink"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate">基本面 ≥ {form.minFundamental}</span>
              <input type="range" min={0} max={90} step={5} value={form.minFundamental} onChange={(e) => update("minFundamental", Number(e.target.value))} className="accent-pine" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate">籌碼面 ≥ {form.minChip}{form.market === "US" ? "(美股無)" : ""}</span>
              <input type="range" min={0} max={90} step={5} value={form.minChip} onChange={(e) => update("minChip", Number(e.target.value))} disabled={form.market === "US"} className="accent-pine disabled:opacity-40" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate">本益比 ≤</span>
              <input type="number" min={0} placeholder="不限" value={form.maxPer ?? ""} onChange={(e) => update("maxPer", e.target.value ? Number(e.target.value) : null)} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:shadow-focus" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate">殖利率 ≥ (%)</span>
              <input type="number" min={0} step={0.5} placeholder="不限" value={form.minDividendYield ?? ""} onChange={(e) => update("minDividendYield", e.target.value ? Number(e.target.value) : null)} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:shadow-focus" />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate">排序</span>
              <select value={form.sortBy} onChange={(e) => update("sortBy", e.target.value as ScreenerRequestInput["sortBy"])} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:shadow-focus">
                {sortOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={isLoading} className="inline-flex h-11 items-center gap-2 rounded-xl bg-pine px-6 text-sm font-semibold text-white transition hover:bg-pine-dark disabled:opacity-60">
              <Filter size={16} />
              {isLoading ? "篩選中..." : "開始選股"}
            </button>
          </div>
        </Card>
      </form>

      {error ? (
        <div className="rounded-xl border border-coral/30 bg-coral-soft p-4 text-sm font-medium text-coral">{error}</div>
      ) : null}

      {isLoading ? (
        <div className="grid min-h-[200px] place-items-center rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-slate">
          正在分析股票池(首次查詢需多花一點時間)...
        </div>
      ) : null}

      {result && !isLoading ? (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <p className="text-sm font-semibold text-ink">
              篩選結果 <span className="text-slate">· {result.count} / {result.universeSize} 檔</span>
            </p>
            {result.notes.length ? <p className="text-xs text-slate">{result.notes.join(" ")}</p> : null}
          </div>
          {result.rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate">沒有符合條件的標的,試著放寬篩選。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-slate">
                    <th className="px-5 py-2.5 font-medium">標的</th>
                    <th className="px-3 py-2.5 text-center font-medium">綜合</th>
                    <th className="px-3 py-2.5 text-center font-medium">基本面</th>
                    <th className="px-3 py-2.5 text-center font-medium">籌碼面</th>
                    <th className="px-3 py-2.5 text-right font-medium">本益比</th>
                    <th className="px-3 py-2.5 text-right font-medium">殖利率</th>
                    <th className="px-3 py-2.5 text-right font-medium">營收YoY</th>
                    <th className="px-5 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row: ScreenerRow) => (
                    <tr key={row.symbol} className="border-b border-line/60 transition hover:bg-mist/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink tabular">{row.symbol}</span>
                          <span className="text-slate">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center"><ScorePill score={row.totalScore} /></td>
                      <td className="px-3 py-3 text-center text-ink tabular">{row.fundamentalScore}</td>
                      <td className="px-3 py-3 text-center text-ink tabular">{row.chipScore ?? "—"}</td>
                      <td className="px-3 py-3 text-right text-ink tabular">{fmt(row.per)}</td>
                      <td className="px-3 py-3 text-right text-ink tabular">{fmt(row.dividendYield, "%")}</td>
                      <td className={`px-3 py-3 text-right tabular ${(row.revenueYoyPercent ?? 0) >= 0 ? "text-pine" : "text-coral"}`}>{fmt(row.revenueYoyPercent, "%")}</td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/stock?symbol=${encodeURIComponent(row.symbol)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-pine hover:text-pine-dark">
                          分析
                          <ArrowUpRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {!result && !isLoading && !error ? (
        <div className="grid min-h-[200px] place-items-center rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-slate">
          設定條件後開始選股,結果可直接點入個股深度分析。
        </div>
      ) : null}

      <p className="text-center text-xs text-slate/70">股票池為精選代表性標的,僅供教育參考,非投資建議。</p>
    </main>
  );
}
