"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ChipAnalysis, ScoreItem } from "@/lib/types";

import { scoreColor } from "@/lib/score";

function fmtLots(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("en-US")} 張`;
}

function fmtPercent(value: number | null, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pine" | "coral" | "ink" }) {
  const color = tone === "pine" ? "text-pine" : tone === "coral" ? "text-coral" : "text-ink";
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <p className="text-xs font-medium text-ink/50">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
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

export function ChipDashboard({ data }: { data: ChipAnalysis }) {
  if (!data.available) {
    return (
      <div className="grid min-h-[260px] place-items-center rounded-xl border border-dashed border-ink/20 bg-white p-8 text-center text-ink/55">
        {data.summary}
      </div>
    );
  }

  const m = data.metrics;
  const instData = data.institutionalTrend.map((p) => ({
    date: p.date.slice(5),
    外資: p.foreign,
    投信: p.trust,
    自營商: p.dealer
  }));
  const marginData = data.marginTrend.map((p) => ({ date: p.date.slice(5), 融資: p.marginBalance, 融券: p.shortBalance }));
  const holdingData = data.foreignHoldingTrend.map((p) => ({ date: p.date.slice(5), 外資持股: p.ratio }));

  return (
    <div className="grid gap-6">
      {/* 摘要 */}
      <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-panel">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink/60">籌碼面評分</h2>
          <span className="text-2xl font-bold" style={{ color: scoreColor(data.chipScore) }}>
            {data.chipScore}
            <span className="text-sm font-medium text-ink/40"> / 100</span>
          </span>
        </div>
        <p className="mt-3 rounded-lg bg-mist/60 p-3 text-sm leading-relaxed text-ink/70">{data.summary}</p>
      </div>

      {/* 指標 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="外資近 5 日" value={fmtLots(m.foreignNet5d)} tone={(m.foreignNet5d ?? 0) >= 0 ? "pine" : "coral"} />
        <Stat label="外資近 20 日" value={fmtLots(m.foreignNet20d)} tone={(m.foreignNet20d ?? 0) >= 0 ? "pine" : "coral"} />
        <Stat label="投信近 5 日" value={fmtLots(m.trustNet5d)} tone={(m.trustNet5d ?? 0) >= 0 ? "pine" : "coral"} />
        <Stat
          label="外資連續進出"
          value={m.consecutiveForeignDays ? `${m.consecutiveForeignDays > 0 ? "買超" : "賣超"} ${Math.abs(m.consecutiveForeignDays)} 日` : "—"}
          tone={m.consecutiveForeignDays >= 0 ? "pine" : "coral"}
        />
        <Stat label="融資餘額" value={m.marginBalance !== null ? `${m.marginBalance.toLocaleString("en-US")} 張` : "—"} />
        <Stat label="融資 5 日變化" value={fmtPercent(m.marginChange5dPercent)} tone={(m.marginChange5dPercent ?? 0) <= 0 ? "pine" : "coral"} />
        <Stat label="券資比" value={fmtPercent(m.shortMarginRatio)} />
        <Stat label="外資持股比率" value={fmtPercent(m.foreignHoldingPercent)} />
      </div>

      {/* 評分拆解 */}
      <div className="grid gap-3 rounded-xl border border-ink/10 bg-white p-6">
        <h2 className="text-sm font-semibold text-ink/60">評分拆解</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {data.scoreBreakdown.map((item) => (
            <ScoreBreakdownRow key={item.label} item={item} />
          ))}
        </div>
      </div>

      {/* 三大法人買賣超 */}
      {instData.length > 0 ? (
        <div className="grid gap-3 rounded-xl border border-ink/10 bg-white p-6">
          <h2 className="text-sm font-semibold text-ink/60">三大法人每日買賣超(張)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={instData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" stroke="#edf2ef" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#17201d80" }} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: "#17201d80" }} width={52} />
                <Tooltip formatter={(value: number) => `${value.toLocaleString("en-US")} 張`} />
                <Bar dataKey="外資" stackId="a" fill="#1f6f58" isAnimationActive={false} />
                <Bar dataKey="投信" stackId="a" fill="#d4a73f" isAnimationActive={false} />
                <Bar dataKey="自營商" stackId="a" fill="#9ad8bf" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-ink/40">正值為買超、負值為賣超(堆疊顯示三大法人合計方向)。</p>
        </div>
      ) : null}

      {/* 融資融券 + 外資持股 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {marginData.length > 0 ? (
          <div className="grid gap-3 rounded-xl border border-ink/10 bg-white p-6">
            <h2 className="text-sm font-semibold text-ink/60">融資融券餘額(張)</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={marginData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edf2ef" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#17201d80" }} interval={6} />
                  <YAxis tick={{ fontSize: 11, fill: "#17201d80" }} width={52} />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString("en-US")} 張`} />
                  <Line dataKey="融資" stroke="#ec7f67" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line dataKey="融券" stroke="#1f6f58" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {holdingData.length > 0 ? (
          <div className="grid gap-3 rounded-xl border border-ink/10 bg-white p-6">
            <h2 className="text-sm font-semibold text-ink/60">外資持股比率(%)</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={holdingData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edf2ef" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#17201d80" }} interval={6} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#17201d80" }} width={44} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                  <Line dataKey="外資持股" stroke="#1f6f58" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </div>

      <footer className="text-center text-xs text-ink/40">
        資料來源:{data.source} · 更新 {new Date(data.updatedAt).toLocaleString("zh-TW")} · 籌碼面僅供教育參考,非投資建議。
      </footer>
    </div>
  );
}
