"use client";

import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer
} from "recharts";
import type { ComprehensiveAnalysis } from "@/lib/types";

import { scoreColor } from "@/lib/score";

export function ComprehensiveOverview({ data }: { data: ComprehensiveAnalysis }) {
  const radarData = data.radar.map((axis) => ({ axis: axis.axis, score: axis.score }));
  const aiSourceLabel =
    data.aiReport.source === "local" ? "本地規則分析" : data.aiReport.source === "openai" ? "OpenAI" : "Groq";

  return (
    <div className="grid gap-6">
      {/* 總評分 + 雷達 */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="grid place-items-center gap-2 rounded-xl border border-ink/10 bg-white p-6 shadow-panel">
          <p className="text-sm font-medium text-ink/50">綜合評分</p>
          <p className="text-6xl font-bold" style={{ color: scoreColor(data.totalScore) }}>
            {data.totalScore}
          </p>
          <span
            className="rounded-full px-3 py-1 text-sm font-semibold text-white"
            style={{ backgroundColor: scoreColor(data.totalScore) }}
          >
            {data.rating}
          </span>
          <div className="mt-2 grid w-full gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-ink/55">基本面</span>
              <span className="font-semibold">{data.fundamental.fundamentalScore}</span>
            </div>
            {data.chip ? (
              <div className="flex justify-between">
                <span className="text-ink/55">籌碼面</span>
                <span className="font-semibold">{data.chip.chipScore}</span>
              </div>
            ) : (
              <p className="text-xs text-ink/40">美股不含籌碼面評分</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-panel">
          <h2 className="mb-2 text-sm font-semibold text-ink/60">多維評分雷達</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="#e2e8e4" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: "#17201d99" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#17201d55" }} angle={90} />
                <Radar dataKey="score" stroke="#1f6f58" fill="#1f6f58" fillOpacity={0.35} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI 報告 */}
      <div className="grid gap-4 rounded-xl border border-ink/10 bg-white p-6 shadow-panel">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-pine" />
          <h2 className="text-lg font-semibold text-ink">AI 綜合分析報告</h2>
          <span className="rounded-md bg-mist px-2 py-0.5 text-xs font-medium text-ink/55">{aiSourceLabel}</span>
        </div>
        <p className="rounded-lg bg-mist/60 p-4 text-sm leading-relaxed text-ink/75">{data.aiReport.summary}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-pine/20 bg-pine/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-pine">
              <TrendingUp size={16} />
              利多論點
            </div>
            <ul className="grid gap-2">
              {data.aiReport.bullPoints.map((point, index) => (
                <li key={index} className="flex gap-2 text-sm text-ink/70">
                  <span className="text-pine">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-coral/20 bg-coral/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-coral">
              <TrendingDown size={16} />
              利空論點
            </div>
            <ul className="grid gap-2">
              {data.aiReport.bearPoints.map((point, index) => (
                <li key={index} className="flex gap-2 text-sm text-ink/70">
                  <span className="text-coral">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-center text-xs text-ink/40">
          AI 報告依據真實數據生成,僅供教育參考,非投資建議。
        </p>
      </div>
    </div>
  );
}
