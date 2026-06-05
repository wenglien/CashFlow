"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  Filter,
  Gauge,
  LineChart,
  PieChart,
  Search,
  ShieldAlert,
  TrendingUp
} from "lucide-react";
import { Badge, Card } from "@/components/ui";

const quickPicks = ["2330", "0050", "2454", "AAPL", "NVDA"];

const marketPulse = [
  { label: "市場狀態", value: "偏多觀察", detail: "科技股動能較強，收益型標的適合作為現金流底倉。", tone: "text-pine", icon: TrendingUp },
  { label: "風險提醒", value: "估值分化", detail: "高成長標的需要搭配回撤與成交量確認。", tone: "text-coral", icon: ShieldAlert },
  { label: "下一步", value: "先選市場", detail: "選 5 到 8 檔標的後，再進入市場頁或模擬頁比較。", tone: "text-gold", icon: Gauge }
];

const nextActions = [
  { label: "看市場總覽", href: "/simulation", desc: "選擇一組台美市場清單" },
  { label: "分析台積電", href: "/stock?symbol=2330", desc: "查看個股基本面與籌碼" },
  { label: "做現金流模擬", href: "/simulation", desc: "把候選標的轉成配置建議" }
];

const features = [
  {
    icon: LineChart,
    title: "個股深度分析",
    desc: "基本面、籌碼面、AI 綜合報告與多維評分雷達,一頁看懂一檔股票。",
    tone: "pine" as const,
    href: "/stock?symbol=2330"
  },
  {
    icon: Filter,
    title: "條件選股",
    desc: "用基本面與籌碼評分、本益比、殖利率等條件,從股票池篩出口袋名單。",
    tone: "sky" as const,
    href: "/screener"
  },
  {
    icon: Activity,
    title: "策略回測",
    desc: "用真實歷史日線測試買進持有、均線交叉、定期定額的績效與風險。",
    tone: "gold" as const,
    href: "/backtest"
  },
  {
    icon: Brain,
    title: "現金流模擬",
    desc: "Monte Carlo 壓力測試,估算被動現金流與資產續航力。",
    tone: "mint" as const,
    href: "/simulation"
  }
];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function go(event: React.FormEvent) {
    event.preventDefault();
    const next = query.trim();
    if (next) router.push(`/stock?symbol=${encodeURIComponent(next)}`);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <section className="grid animate-fade-up gap-5 lg:grid-cols-[1fr_420px] lg:items-start">
        <div className="rounded-lg border border-ink/10 bg-ink p-5 text-white shadow-panel sm:p-6">
          <Badge tone="mint">
            <Activity size={13} />
            今日投資儀表板
          </Badge>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                先看市場狀態，
                <br />
                再決定要分析哪一檔
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                CashFlow 把市場報價、個股基本面、籌碼面與現金流模擬放在同一個決策流程。你可以先問 AI，也可以直接選市場或輸入代號。
              </p>
            </div>
            <div className="rounded-md bg-white/10 px-3 py-2 text-xs font-semibold text-white/70">
              教育研究用途 · 非投資建議
            </div>
          </div>

          <form onSubmit={go} className="mt-8 flex max-w-md gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-md border border-white/15 bg-white px-4 shadow-card focus-within:shadow-focus">
              <Search size={18} className="text-ink/45" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="輸入代號,如 2330 或 AAPL"
                className="h-12 w-full bg-transparent text-base text-ink outline-none placeholder:text-ink/35"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-mint px-5 text-sm font-semibold text-ink shadow-card transition hover:bg-white"
            >
              分析
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/55">熱門:</span>
            {quickPicks.map((symbol) => (
              <Link
                key={symbol}
                href={`/stock?symbol=${symbol}`}
                className="inline-flex min-h-9 items-center rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white hover:text-ink"
              >
                {symbol}
              </Link>
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {marketPulse.map((item) => (
              <div key={item.label} className="rounded-lg bg-white/8 p-4 ring-1 ring-white/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-white/55">
                  <item.icon size={15} className={item.tone} />
                  {item.label}
                </div>
                <p className={`mt-2 text-xl font-semibold ${item.tone}`}>{item.value}</p>
                <p className="mt-2 text-xs leading-5 text-white/58">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="animate-fade-up p-5 shadow-panel">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate">AI 建議工作流</p>
              <p className="text-xs text-slate/70">從市場到配置</p>
            </div>
            <Badge tone="pine">可立即開始</Badge>
          </div>
          <div className="mt-5 grid gap-3">
            {nextActions.map((action, index) => (
              <Link key={action.label} href={action.href} className="group rounded-lg border border-line bg-mist/70 p-4 transition hover:border-pine/40 hover:bg-white">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-pine text-sm font-semibold text-white">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{action.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate">{action.desc}</p>
                  </div>
                  <ArrowRight size={16} className="mt-1 text-pine opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {[
              { label: "市場資料", w: 88 },
              { label: "AI 頁面感知", w: 82 },
              { label: "模擬建議", w: 74 }
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-slate">{row.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
                  <div className="h-full rounded-full bg-pine/80" style={{ width: `${row.w}%` }} />
                </div>
                <span className="w-7 text-right text-xs font-semibold text-ink tabular">{row.w}</span>
              </div>
            ))}
          </div>
          <Link href="/simulation" className="mt-5 flex items-center justify-center gap-1 rounded-md bg-pine px-4 py-3 text-sm font-semibold text-white hover:bg-ink">
            開始市場選擇
            <ArrowRight size={15} />
          </Link>
        </Card>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink/65">
          <CheckCircle2 size={16} className="text-pine" />
          常用工具
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Link key={f.title} href={f.href} className="group">
              <Card className="h-full p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-panel">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${
                  f.tone === "pine"
                    ? "bg-pine-soft text-pine"
                    : f.tone === "sky"
                      ? "bg-sky-soft text-sky"
                      : f.tone === "gold"
                        ? "bg-gold-soft text-[#9a7110]"
                        : "bg-mint/25 text-pine-dark"
                }`}>
                  <f.icon size={22} />
                </span>
                <h3 className="mt-4 flex items-center gap-1 font-semibold text-ink">
                  {f.title}
                  <ArrowRight size={14} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate">{f.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 次要 CTA */}
      <section className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <div className="flex items-center gap-3">
          <PieChart className="text-pine" size={22} />
          <p className="text-sm text-slate">
            想規劃整體資產配置?用 <span className="font-semibold text-ink">現金流模擬</span> 壓力測試你的投資組合。
          </p>
        </div>
        <Link href="/simulation" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-mist">
          開始模擬
          <ArrowRight size={15} />
        </Link>
      </section>

      <p className="mt-10 text-center text-xs text-slate/70">
        本平台僅供教育與研究參考,非投資建議。
      </p>
    </main>
  );
}
