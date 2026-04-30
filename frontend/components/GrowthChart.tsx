"use client";

import type { GrowthPoint } from "@/lib/types";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const moneyCompact = new Intl.NumberFormat("zh-TW", {
  notation: "compact",
  maximumFractionDigits: 1
});

function formatAxis(value: number) {
  return `NT$${moneyCompact.format(value)}`;
}

function formatTooltip(v: number | undefined) {
  if (v === undefined) return "—";
  return `NT$${new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(v)}`;
}

type Row = {
  year: number;
  p5: number;
  median: number;
  p95: number;
};

export function GrowthChart({ data }: { data: GrowthPoint[] }) {
  const rows: Row[] = data.map((point) => ({
    year: point.year,
    p5: point.p5,
    median: point.median,
    p95: point.p95
  }));

  if (rows.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-lg border border-dashed border-ink/15 bg-mist/50 text-sm text-ink/50">
        尚無資料
      </div>
    );
  }

  return (
    <div className="h-80 w-full pt-2" data-testid="growth-chart-3d">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="#dce5e0" strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fill: "rgba(23,32,29,0.55)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(23,32,29,0.12)" }}
            label={{ value: "年（模擬期間）", position: "bottom", offset: -2, fill: "rgba(23,32,29,0.45)", fontSize: 11 }}
          />
          <YAxis
            tickFormatter={formatAxis}
            tick={{ fontSize: 12, fill: "rgba(23,32,29,0.55)" }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid rgba(23,32,29,0.1)",
              boxShadow: "0 12px 36px rgba(23, 32, 29, 0.08)",
              fontSize: 13
            }}
            labelFormatter={(y) => `第 ${y} 年`}
            formatter={(value: number | string, name: string) => [formatTooltip(Number(value)), name]}
          />
          <Legend
            wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
            formatter={(value) => <span className="text-ink/80">{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="p95"
            name="樂觀 (P95)"
            stroke="#3d8f6e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            strokeDasharray="6 4"
          />
          <Line
            type="monotone"
            dataKey="median"
            name="中位數"
            stroke="#1f6f58"
            strokeWidth={3}
            dot={{ r: 2, strokeWidth: 0, fill: "#1f6f58" }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="p5"
            name="保守 (P5)"
            stroke="#ec7f67"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            strokeDasharray="6 4"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
