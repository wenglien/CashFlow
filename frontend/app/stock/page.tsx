"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChipDashboard } from "@/components/ChipDashboard";
import { ComprehensiveOverview } from "@/components/ComprehensiveOverview";
import { FundamentalDashboard } from "@/components/FundamentalDashboard";
import { getComprehensiveAnalysis } from "@/lib/api";
import type { ComprehensiveAnalysis } from "@/lib/types";

type TabKey = "overview" | "fundamental" | "chip";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "綜合總覽" },
  { key: "fundamental", label: "基本面" },
  { key: "chip", label: "籌碼面" }
];

function StockPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const symbol = (searchParams.get("symbol") ?? "").trim();

  const [data, setData] = useState<ComprehensiveAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(symbol);
  const [tab, setTab] = useState<TabKey>("overview");

  async function load() {
    if (!symbol) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setData(await getComprehensiveAnalysis(symbol));
    } catch {
      setError("無法取得此代號的分析資料,請確認代號或稍後再試。");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setQuery(symbol);
    setTab("overview");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const next = query.trim();
    if (next && next.toUpperCase() !== symbol.toUpperCase()) {
      router.push(`/stock?symbol=${encodeURIComponent(next)}`);
    }
  }

  const chipDisabled = data?.market === "US";

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/market" className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-mist">
          <ArrowLeft size={16} />
          市場總覽
        </Link>
        <form onSubmit={submitSearch} className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 shadow-card focus-within:shadow-focus sm:w-56 sm:flex-none">
            <Search size={16} className="shrink-0 text-slate" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="代號,如 2330 / AAPL"
              className="h-10 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate/60"
            />
          </div>
          <button type="submit" className="inline-flex h-10 shrink-0 items-center rounded-xl bg-pine px-4 text-sm font-semibold text-white transition hover:bg-pine-dark">
            分析
          </button>
          <button
            type="button"
            onClick={load}
            disabled={isLoading || !symbol}
            aria-label="重新整理"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-slate transition hover:bg-mist disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
        </form>
      </div>

      {data ? (
        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-line bg-surface px-5 py-4 shadow-card">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{data.name}</h1>
          <span className="rounded-md bg-mist px-2 py-0.5 text-xs font-semibold text-slate tabular">{data.symbol}</span>
          <span className="rounded-md bg-pine-soft px-2 py-0.5 text-xs font-semibold text-pine">
            {data.market === "TW" ? "台股" : "美股"}
          </span>
        </div>
      ) : null}

      {data ? (
        <div className="flex gap-1 border-b border-line">
          {TABS.map((t) => {
            const disabled = t.key === "chip" && chipDisabled;
            return (
              <button
                key={t.key}
                type="button"
                disabled={disabled}
                onClick={() => setTab(t.key)}
                className={`-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                  tab === t.key
                    ? "border-pine text-pine"
                    : disabled
                      ? "border-transparent text-slate/30"
                      : "border-transparent text-slate hover:bg-mist/60 hover:text-ink"
                }`}
                title={disabled ? "籌碼面僅支援台股" : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-coral/30 bg-coral-soft p-4 text-sm font-medium text-coral">{error}</div>
      ) : null}

      {!symbol ? (
        <div className="grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-slate">
          輸入股票代號開始深度分析(台股如 2330、美股如 AAPL)。
        </div>
      ) : null}

      {isLoading && !data ? (
        <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-slate">
          <div className="flex items-center gap-3">
            <RefreshCw size={18} className="animate-spin text-pine" />
            正在分析 {symbol}(基本面 + 籌碼面 + AI 報告)...
          </div>
        </div>
      ) : null}

      {data ? (
        <div>
          {tab === "overview" ? <ComprehensiveOverview data={data} /> : null}
          {tab === "fundamental" ? <FundamentalDashboard data={data.fundamental} /> : null}
          {tab === "chip" ? (
            data.chip ? (
              <ChipDashboard data={data.chip} />
            ) : (
              <div className="grid min-h-[260px] place-items-center rounded-xl border border-dashed border-ink/20 bg-white p-8 text-center text-ink/55">
                美股無對等的免費籌碼資料,籌碼面分析僅支援台股。
              </div>
            )
          ) : null}
        </div>
      ) : null}
    </main>
  );
}

export default function StockPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6">
          <div className="grid min-h-[420px] place-items-center rounded-lg border border-dashed border-ink/20 bg-white p-8 text-center text-ink/60">
            正在載入...
          </div>
        </main>
      }
    >
      <StockPageContent />
    </Suspense>
  );
}
