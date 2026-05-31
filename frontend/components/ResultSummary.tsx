import type { SimulationResult } from "@/lib/types";
import { RiskCard } from "./RiskCard";

const currency = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0
});

function formatNTD(value: number) {
  return `NT$${currency.format(value)}`;
}

export function ResultSummary({ result }: { result: SimulationResult }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <RiskCard title="每月收入" value={formatNTD(result.averageMonthlyIncome)} tone="stable" />
      <RiskCard title="成功率" value={`${Math.round(result.successRate * 100)}%`} tone="growth" />
      <RiskCard title="預估終值" value={formatNTD(result.projectedFinalValue)} tone="growth" />
      <RiskCard title="最大回撤" value={`${Math.round(result.maxDrawdown * 100)}%`} tone="risk" />
    </div>
  );
}
