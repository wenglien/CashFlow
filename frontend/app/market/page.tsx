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
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/simulation" className="flex items-center gap-2 rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold hover:bg-mist">
          <ArrowLeft size={16} />
          返回重新選擇
        </Link>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-ink disabled:opacity-70"
          onClick={loadMarket}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          重新整理結果
        </button>
      </div>

      {error ? <div className="rounded-lg border border-coral/30 bg-coral/10 p-4 text-sm font-medium text-coral">{error}</div> : null}
      {snapshot ? (
        <>
          <MarketResults snapshot={snapshot} />
          <MarketAiChat symbols={requestedSymbols} />
        </>
      ) : (
        <div className="grid min-h-[420px] place-items-center rounded-lg border border-dashed border-ink/20 bg-white p-8 text-center text-ink/60">
          {isLoading ? "正在載入所選市場資料..." : "尚無市場資料"}
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
