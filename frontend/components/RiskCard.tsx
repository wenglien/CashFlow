import { ShieldCheck, TrendingUp, Waves } from "lucide-react";

type RiskCardProps = {
  title: string;
  value: string;
  tone: "stable" | "growth" | "risk";
};

const icons = {
  stable: ShieldCheck,
  growth: TrendingUp,
  risk: Waves
};

const tones = {
  stable: "bg-mint/30 text-pine",
  growth: "bg-gold/20 text-ink",
  risk: "bg-coral/20 text-coral"
};

export function RiskCard({ title, value, tone }: RiskCardProps) {
  const Icon = icons[tone];

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-ink/60">{title}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-md ${tones[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}
