import Link from "next/link";
import type { ReactNode } from "react";

type DivProps = { className?: string; children: ReactNode };

/** 標準卡片表面 */
export function Card({ className = "", children }: DivProps) {
  return (
    <div className={`rounded-lg border border-line bg-surface shadow-card ${className}`}>{children}</div>
  );
}

/** 區塊標題(小標) */
export function SectionTitle({ children, className = "" }: DivProps) {
  return (
    <h2 className={`text-sm font-semibold uppercase tracking-wide text-slate ${className}`}>{children}</h2>
  );
}

type BadgeTone = "pine" | "mint" | "coral" | "gold" | "sky" | "neutral";

const badgeStyles: Record<BadgeTone, string> = {
  pine: "bg-pine-soft text-pine",
  mint: "bg-mint/25 text-pine-dark",
  coral: "bg-coral-soft text-coral",
  gold: "bg-gold-soft text-[#9a7110]",
  sky: "bg-sky-soft text-sky",
  neutral: "bg-mist text-slate"
};

export function Badge({ children, tone = "neutral", className = "" }: DivProps & { tone?: BadgeTone }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyles[tone]} ${className}`}>
      {children}
    </span>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-pine text-white hover:bg-pine-dark shadow-card",
  secondary: "border border-line bg-surface text-ink hover:bg-mist",
  ghost: "text-slate hover:bg-mist hover:text-ink"
};

const baseButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:shadow-focus disabled:opacity-60 disabled:pointer-events-none";

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  onClick,
  disabled
}: DivProps & {
  variant?: ButtonVariant;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseButton} ${buttonStyles[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  href,
  variant = "primary",
  className = ""
}: DivProps & { href: string; variant?: ButtonVariant }) {
  return (
    <Link href={href} className={`${baseButton} ${buttonStyles[variant]} ${className}`}>
      {children}
    </Link>
  );
}

/** 統計小卡:標籤 + 大數值 + 提示 */
export function Stat({
  label,
  value,
  hint,
  tone
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "pine" | "coral" | "ink";
}) {
  const color = tone === "pine" ? "text-pine" : tone === "coral" ? "text-coral" : "text-ink";
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-xs font-medium text-slate">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular ${color}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate/80">{hint}</p> : null}
    </div>
  );
}

/** 頁面標題列 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
