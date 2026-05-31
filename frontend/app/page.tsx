"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Brain,
  Filter,
  LineChart,
  PieChart,
  Search,
  TrendingUp
} from "lucide-react";
import { Badge, Card } from "@/components/ui";

const quickPicks = ["2330", "0050", "2454", "AAPL", "NVDA"];

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
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      {/* Hero */}
      <section className="grid animate-fade-up gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <Badge tone="pine">
            <TrendingUp size={13} />
            基本面 · 籌碼面 · AI 綜合分析
          </Badge>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
            把每一檔股票
            <br />
            看得<span className="text-pine">更深</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate">
            輸入台股或美股代號,立即取得整合財報、法人籌碼與 AI 分析的深度報告。資料來自 FinMind、yfinance 真實來源。
          </p>

          <form onSubmit={go} className="mt-8 flex max-w-md gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-4 shadow-card focus-within:shadow-focus">
              <Search size={18} className="text-slate" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="輸入代號,如 2330 或 AAPL"
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate/60"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-pine px-5 text-sm font-semibold text-white shadow-card transition hover:bg-pine-dark"
            >
              分析
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate">熱門:</span>
            {quickPicks.map((symbol) => (
              <Link
                key={symbol}
                href={`/stock?symbol=${symbol}`}
                className="rounded-lg border border-line bg-surface px-3 py-1 text-xs font-semibold text-slate transition hover:border-pine/40 hover:text-pine"
              >
                {symbol}
              </Link>
            ))}
          </div>
        </div>

        {/* Hero 視覺卡 */}
        <Card className="animate-fade-up p-6 shadow-panel">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate">台積電</p>
              <p className="text-xs text-slate/70">2330 · 台股</p>
            </div>
            <Badge tone="pine">綜合 63 · 良好</Badge>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { k: "基本面", v: "69", c: "text-pine" },
              { k: "籌碼面", v: "54", c: "text-gold" },
              { k: "AI 多空", v: "2:2", c: "text-ink" }
            ].map((m) => (
              <div key={m.k} className="rounded-xl bg-mist/70 p-3 text-center">
                <p className="text-xs text-slate">{m.k}</p>
                <p className={`mt-1 text-2xl font-bold tabular ${m.c}`}>{m.v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {[
              { label: "獲利能力", w: 90 },
              { label: "成長性", w: 76 },
              { label: "估值", w: 45 },
              { label: "法人動向", w: 60 }
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-slate">{row.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
                  <div className="h-full rounded-full bg-pine/80" style={{ width: `${row.w}%` }} />
                </div>
                <span className="w-7 text-right text-xs font-semibold text-ink tabular">{row.w}</span>
              </div>
            ))}
          </div>
          <Link href="/stock?symbol=2330" className="mt-5 flex items-center justify-center gap-1 text-sm font-semibold text-pine hover:text-pine-dark">
            查看完整分析
            <ArrowRight size={15} />
          </Link>
        </Card>
      </section>

      {/* Feature cards */}
      <section className="mt-16">
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
        <Link href="/simulation" className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-mist">
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
