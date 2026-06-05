"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { MarketResults } from "@/components/MarketResults";
import { MarketAiChat } from "@/components/MarketAiChat";
import { getMarketSnapshot } from "@/lib/api";
import { DEFAULT_SELECTED_SYMBOLS, normalizeSymbols } from "@/lib/marketOptions";
import type { MarketSnapshot } from "@/lib/types";

function MarketPageContent() {
  const searchParams = useSearchParams();
  const requestedSymbols = useMemo(() => {
    const raw = searchParams.get("symbols") ?? DEFAULT_SELECTED_SYMBOLS.join(",");
    return normalizeSymbols(raw);
  }, [searchParams]);
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMarket() {
    setIsLoading(true);
    setError(null);
    try {
      setSnapshot(await getMarketSnapshot(requestedSymbols));
    } catch {
      setError("市場資料暫時無法取得，請返回重新選擇或確認後端服務。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMarket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedSymbols.join(",")]);

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-8">
      <div className="sticky top-[61px] z-40 -mx-4 flex items-center justify-between gap-2 border-b border-line/70 bg-mist/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
        <Link href="/simulation" className="flex min-w-0 items-center gap-2 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-semibold shadow-panel hover:bg-mist sm:bg-transparent sm:px-4 sm:shadow-none">
          <ArrowLeft size={16} />
          <span className="truncate">返回重新選擇</span>
        </Link>
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded-md bg-pine px-3 py-2 text-sm font-semibold text-white hover:bg-ink disabled:opacity-70 sm:px-4"
          onClick={loadMarket}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          <span className="hidden sm:inline">重新整理結果</span>
          <span className="sm:hidden">更新</span>
        </button>
      </div>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-coral/30 bg-coral/10 p-4 text-sm font-medium text-coral">
          <span>{error}</span>
          <button
            type="button"
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-coral shadow-panel hover:bg-coral hover:text-white"
            onClick={loadMarket}
          >
            重新取得
          </button>
        </div>
      ) : null}
      {snapshot ? (
        <>
          <MarketResults snapshot={snapshot} />
          <MarketAiChat symbols={requestedSymbols} mode="embedded" />
        </>
      ) : (
        <div className="grid min-h-[420px] gap-4 rounded-lg border border-dashed border-ink/20 bg-white p-8 text-ink/60">
          {isLoading ? (
            <div className="grid place-items-center gap-4 text-center">
              <div className="grid w-full max-w-xl gap-3">
                <div className="mx-auto h-5 w-40 rounded-full bg-mist" />
                <div className="h-24 rounded-lg bg-mist" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-20 rounded-lg bg-mist" />
                  <div className="h-20 rounded-lg bg-mist" />
                </div>
              </div>
              <span>正在載入所選市場資料...</span>
            </div>
          ) : (
            <div className="grid place-items-center text-center">尚無市場資料</div>
          )}
        </div>
      )}
    </main>
  );
}

export default function MarketPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6">
          <div className="grid min-h-[420px] place-items-center rounded-lg border border-dashed border-ink/20 bg-white p-8 text-center text-ink/60">
            正在載入查詢條件...
          </div>
        </main>
      }
    >
      <MarketPageContent />
    </Suspense>
  );
}
