"use client";

import { Gauge, Play, RotateCcw, WalletCards } from "lucide-react";
import type { FormEvent } from "react";
import type { PortfolioInput, RiskLevel } from "@/lib/types";

type InputFormProps = {
  value: PortfolioInput;
  onChange: (value: PortfolioInput) => void;
  onSubmit: () => void;
  isLoading?: boolean;
};

const riskLevels: RiskLevel[] = ["conservative", "balanced", "aggressive"];
const riskLabels: Record<RiskLevel, string> = {
  conservative: "保守型",
  balanced: "均衡型",
  aggressive: "積極型"
};

const money = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0
});

const presets: Array<{ label: string; value: PortfolioInput }> = [
  {
    label: "穩健入門",
    value: { totalCapital: 300000, targetMonthlyIncome: 1000, investmentYears: 15, riskLevel: "conservative", currency: "TWD" }
  },
  {
    label: "均衡成長",
    value: { totalCapital: 1000000, targetMonthlyIncome: 4000, investmentYears: 20, riskLevel: "balanced", currency: "TWD" }
  },
  {
    label: "科技積極",
    value: { totalCapital: 1500000, targetMonthlyIncome: 6000, investmentYears: 25, riskLevel: "aggressive", currency: "TWD" }
  }
];

export function InputForm({ value, onChange, onSubmit, isLoading = false }: InputFormProps) {
  const annualIncomeTarget = value.targetMonthlyIncome * 12;
  const withdrawalRate = value.totalCapital > 0 ? annualIncomeTarget / value.totalCapital : 0;
  const riskText = withdrawalRate <= 0.04 ? "壓力較低" : withdrawalRate <= 0.07 ? "需要觀察" : "目標偏緊";
  const riskTone = withdrawalRate <= 0.04 ? "text-pine" : withdrawalRate <= 0.07 ? "text-gold" : "text-coral";

  function update<K extends keyof PortfolioInput>(key: K, nextValue: PortfolioInput[K]) {
    onChange({ ...value, [key]: nextValue });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
      <div>
        <p className="text-sm font-semibold text-pine">模擬假設</p>
        <h2 className="mt-1 text-xl font-semibold">投資現金流設定</h2>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink/55">
          <WalletCards size={14} />
          快速情境
        </div>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="rounded-md bg-mist px-2 py-2 text-xs font-semibold text-ink/70 hover:bg-pine hover:text-white"
              onClick={() => onChange(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <label className="grid gap-2 text-sm font-medium">
        <span className="flex items-center justify-between">
          投資本金（NTD）
          <span className="text-xs text-ink/45">NT${money.format(value.totalCapital)}</span>
        </span>
        <input
          className="rounded-md border border-ink/15 px-3 py-2 outline-none focus:border-pine"
          type="number"
          min={10000}
          step={10000}
          value={value.totalCapital}
          onChange={(event) => update("totalCapital", Number(event.target.value))}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        <span className="flex items-center justify-between">
          目標每月收入（NTD）
          <span className="text-xs text-ink/45">NT${money.format(value.targetMonthlyIncome)}</span>
        </span>
        <input
          className="rounded-md border border-ink/15 px-3 py-2 outline-none focus:border-pine"
          type="number"
          min={0}
          step={500}
          value={value.targetMonthlyIncome}
          onChange={(event) => update("targetMonthlyIncome", Number(event.target.value))}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        <span className="flex items-center justify-between">
          投資年限
          <span className="text-xs text-ink/45">{value.investmentYears} 年</span>
        </span>
        <input
          className="accent-pine"
          type="range"
          min={1}
          max={40}
          value={value.investmentYears}
          onChange={(event) => update("investmentYears", Number(event.target.value))}
        />
        <div className="flex justify-between text-[11px] text-ink/40">
          <span>1 年</span>
          <span>40 年</span>
        </div>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        風險等級
        <select
          className="rounded-md border border-ink/15 px-3 py-2 capitalize outline-none focus:border-pine"
          value={value.riskLevel}
          onChange={(event) => update("riskLevel", event.target.value as RiskLevel)}
        >
          {riskLevels.map((risk) => (
            <option key={risk} value={risk}>
              {riskLabels[risk]}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 rounded-lg bg-mist p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink/65">
            <Gauge size={16} className="text-pine" />
            目標提領率
          </div>
          <span className={`text-lg font-semibold ${riskTone}`}>{(withdrawalRate * 100).toFixed(1)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-pine" style={{ width: `${Math.min(Math.max(withdrawalRate * 1000, 4), 100)}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-ink/55">
          <span>年化收入目標 NT${money.format(annualIncomeTarget)}</span>
          <span className={riskTone}>{riskText}</span>
        </div>
      </div>

      <button
        className="mt-2 flex items-center justify-center gap-2 rounded-md bg-pine px-4 py-3 font-semibold text-white hover:bg-ink disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isLoading}
      >
        <Play size={18} />
        {isLoading ? "模擬中..." : "執行模擬"}
      </button>
      <button
        type="button"
        className="flex items-center justify-center gap-2 rounded-md border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/65 hover:bg-mist"
        onClick={() => onChange({ totalCapital: 1000000, targetMonthlyIncome: 4000, investmentYears: 20, riskLevel: "balanced", currency: "TWD" })}
      >
        <RotateCcw size={15} />
        重設假設
      </button>
    </form>
  );
}
