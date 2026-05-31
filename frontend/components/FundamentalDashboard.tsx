"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { FundamentalAnalysis, ScoreItem } from "@/lib/types";

import { scoreColor } from "@/lib/score";

function fmtNum(value: number | null, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPercent(value: number | null, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

function fmtBig(value: number | null, market: "TW" | "US"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (market === "TW") {
    return `${(value / 1e8).toLocaleString("en-US", { maximumFractionDigits: 1 })} 億`;
  }
  return `${(value / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 })} B`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <p className="text-xs font-medium text-ink/50">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink/40">{hint}</p> : null}
    </div>
  );
}

function ScoreBreakdownRow({ item }: { item: ScoreItem }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink">
          {item.label}
          <span className="ml-2 text-xs text-ink/40">權重 {Math.round(item.weight * 100)}%</span>
        </span>
        <span className="font-semibold" style={{ color: scoreColor(item.score) }}>
          {item.score}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-mist">
        <div className="h-full rounded-full" style={{ width: `${item.score}%`, backgroundColor: scoreColor(item.score) }} />
      </div>
      <p className="text-xs text-ink/45">{item.detail}</p>
    </div>
  );
}

export function FundamentalDashboard({ data }: { data: FundamentalAnalysis }) {
  const { valuation, growth, market } = data;
  const currencyUnit = market === "TW" ? "元" : "USD";

  // 財報圖:由舊到新排序,顯示營收(柱)與淨利率(線)。
  const statementChart = [...data.statements]
    .reverse()
    .map((s) => ({
      period: s.period.slice(0, 7),
      revenue: s.revenue,
      netMargin: s.netMargin,
      grossMargin: s.grossMargin
    }));

  const revenueChart = [...data.revenueTrend]
    .reverse()
    .map((r) => ({ month: r.month, revenue: r.revenue, yoy: r.yoyPercent }));

  return (
    <div className="grid gap-6">
      {/* 標題 + 總評分 */}
      <header className="rounded-xl border border-ink/10 bg-white p-6 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-ink">{data.name}</h1>
              <span className="rounded-md bg-mist px-2 py-0.5 text-xs font-semibold text-ink/60">{data.symbol}</span>
              <span className="rounded-md bg-pine/10 px-2 py-0.5 text-xs font-semibold text-pine">
                {market === "TW" ? "台股" : "美股"}
              </span>
            </div>
            {data.industry ? <p className="mt-1 text-sm text-ink/50">{data.industry}</p> : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-medium text-ink/50">基本面評分</p>
              <p className="text-3xl font-bold" style={{ color: scoreColor(data.fundamentalScore) }}>
                {data.fundamentalScore}
                <span className="text-base font-medium text-ink/40"> / 100</span>
              </p>
            </div>
          </div>
        </div>
        <p className="mt-4 rounded-lg bg-mist/60 p-3 text-sm leading-relaxed text-ink/70">{data.summary}</p>
        {!data.dataAvailable ? (
          <p className="mt-3 rounded-lg border border-gold/30 bg-gold/10 p-3 text-sm text-ink/70">
            ⚠️ 此代號目前無法取得完整資料{data.notes.length ? `:${data.notes.join("；")}` : "。"}
          </p>
        ) : null}
      </header>

      {/* 估值 */}
      <section className="grid gap-3">
        <h2 className="text-sm font-semibold text-ink/60">估值指標</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="本益比 (PER)" value={fmtNum(valuation.per, 1)} hint={valuation.asOf ? `資料日 ${valuation.asOf}` : undefined} />
          <Stat label="股價淨值比 (PBR)" value={fmtNum(valuation.pbr, 2)} />
          <Stat label="殖利率" value={fmtPercent(valuation.dividendYield)} />
          <Stat
            label={market === "TW" ? "ROE" : "市值"}
            value={market === "TW" ? fmtPercent(valuation.roe) : fmtBig(valuation.marketCap, market)}
          />
        </div>
      </section>

      {/* 成長性 */}
      <section className="grid gap-3">
        <h2 className="text-sm font-semibold text-ink/60">成長性</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="營收年增 (YoY)" value={fmtPercent(growth.revenueYoyPercent)} />
          <Stat label={market === "TW" ? "營收月增 (MoM)" : "EPS 年增"} value={fmtPercent(market === "TW" ? growth.revenueMomPercent : growth.epsYoyPercent)} />
          <Stat label="近四季 EPS (TTM)" value={fmtNum(growth.ttmEps)} hint={currencyUnit} />
          <Stat label="EPS 年增" value={fmtPercent(growth.epsYoyPercent)} />
        </div>
      </section>

      {/* 評分拆解 */}
      <section className="grid gap-3 rounded-xl border border-ink/10 bg-white p-6">
        <h2 className="text-sm font-semibold text-ink/60">評分拆解</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.scoreBreakdown.map((item) => (
            <ScoreBreakdownRow key={item.label} item={item} />
          ))}
        </div>
      </section>

      {/* 財報趨勢 */}
      {statementChart.length > 0 ? (
        <section className="grid gap-3 rounded-xl border border-ink/10 bg-white p-6">
          <h2 className="text-sm font-semibold text-ink/60">季度營收與利潤率</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={statementChart} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf2ef" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#17201d80" }} />
                <YAxis yAxisId="rev" tick={{ fontSize: 11, fill: "#17201d80" }} tickFormatter={(v) => fmtBig(v, market)} width={60} />
                <YAxis yAxisId="margin" orientation="right" tick={{ fontSize: 11, fill: "#17201d80" }} tickFormatter={(v) => `${v}%`} width={42} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "營收" ? fmtBig(value, market) : fmtPercent(value)
                  }
                />
                <Bar yAxisId="rev" dataKey="revenue" name="營收" fill="#9ad8bf" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Line yAxisId="margin" dataKey="netMargin" name="淨利率" stroke="#1f6f58" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="margin" dataKey="grossMargin" name="毛利率" stroke="#d4a73f" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      {/* 月營收趨勢(台股) */}
      {revenueChart.length > 0 ? (
        <section className="grid gap-3 rounded-xl border border-ink/10 bg-white p-6">
          <h2 className="text-sm font-semibold text-ink/60">月營收與年增率</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChart} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf2ef" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#17201d80" }} interval={1} />
                <YAxis tick={{ fontSize: 11, fill: "#17201d80" }} tickFormatter={(v) => fmtBig(v, market)} width={60} />
                <Tooltip formatter={(value: number, name: string) => (name === "營收" ? fmtBig(value, market) : fmtPercent(value))} />
                <Bar dataKey="revenue" name="營收" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {revenueChart.map((entry, index) => (
                    <Cell key={index} fill={(entry.yoy ?? 0) >= 0 ? "#1f6f58" : "#ec7f67"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-ink/40">綠色為年增正成長月份,珊瑚色為衰退月份。</p>
        </section>
      ) : null}

      <footer className="text-center text-xs text-ink/40">
        資料來源:{data.source} · 更新時間 {new Date(data.updatedAt).toLocaleString("zh-TW")} · 本頁僅供教育參考,非投資建議。
      </footer>
    </div>
  );
}
