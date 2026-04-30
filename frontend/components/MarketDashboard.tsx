"use client";

import { Activity, Check, ListFilter, Search, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_SELECTED_SYMBOLS, MARKET_WATCHLIST, normalizeSymbols } from "@/lib/marketOptions";

const marketGroups = [
  {
    title: "台股 ETF",
    symbols: ["0050.TW", "0056.TW", "006208.TW", "00692.TW", "00733.TW", "00878.TW", "00929.TW"]
  },
  {
    title: "台股大型科技股",
    symbols: ["2330.TW", "2317.TW", "2454.TW", "2308.TW", "2382.TW", "2303.TW", "3711.TW", "2412.TW"]
  },
  {
    title: "美國大型科技股",
    symbols: ["AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN", "META", "AVGO"]
  },
  {
    title: "美股大盤／風格",
    symbols: ["SPY", "QQQ", "VOO", "IVV", "VTI", "IWM", "VO", "SPLG"]
  },
  {
    title: "收益／股息型",
    symbols: ["SCHD", "VYM", "DGRO", "JEPI", "QUAL"]
  },
  {
    title: "債券與固定收益",
    symbols: ["TLT", "IEF", "AGG", "BND", "VCIT", "LQD", "HYG"]
  },
  {
    title: "區域／產業／主題",
    symbols: ["VEA", "VXUS", "EWJ", "EWG", "VNQ", "XLK", "XLF", "SOXX", "SMH", "ARKK", "XLE", "MTUM", "GLD"]
  }
];

export function MarketDashboard() {
  const router = useRouter();
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(DEFAULT_SELECTED_SYMBOLS);
  const [customSymbols, setCustomSymbols] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selectedSymbols), [selectedSymbols]);

  const submittedSymbols = useMemo(() => {
    const custom = normalizeSymbols(customSymbols);
    return Array.from(new Set([...selectedSymbols, ...custom]));
  }, [customSymbols, selectedSymbols]);

  const filteredGroups = useMemo(() => {
    const query = pickerQuery.trim().toUpperCase();
    if (!query) return marketGroups;
    return marketGroups
      .map((group) => ({
        ...group,
        symbols: group.symbols.filter((symbol) => symbol.includes(query) || group.title.includes(pickerQuery.trim()))
      }))
      .filter((group) => group.symbols.length > 0);
  }, [pickerQuery]);

  function toggleSymbol(symbol: string) {
    setSelectedSymbols((current) =>
      current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol],
    );
  }

  function toggleGroup(symbols: string[]) {
    const allSelected = symbols.every((symbol) => selectedSet.has(symbol));
    setSelectedSymbols((current) => {
      if (allSelected) return current.filter((symbol) => !symbols.includes(symbol));
      return Array.from(new Set([...current, ...symbols]));
    });
  }

  function submitMarketQuery() {
    if (!submittedSymbols.length) return;
    const params = new URLSearchParams({ symbols: submittedSymbols.join(",") });
    router.push(`/market?${params.toString()}`);
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-lg border border-ink/10 bg-ink p-5 text-white shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-mint">
              <Activity size={18} />
              <span className="text-sm font-semibold uppercase tracking-[0.16em]">即時市場情報</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">選擇要查詢的市場</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/70">
              以台股 ETF、台灣科技股與美國大型科技股為主要分析對象，可同時選擇多個標的，送出後集中顯示市場資料與 3D 視覺化。
            </p>
          </div>
          <div className="rounded-md bg-white/10 px-3 py-2 text-xs font-medium text-white/75">
            已選 {submittedSymbols.length} 檔
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <div className="rounded-lg border border-white/15 bg-black/25 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-mint/90">已選市場</p>
                <p className="mt-1 text-sm text-white/65">點擊下方按鈕開啟小視窗調整多選清單。</p>
              </div>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md bg-mint px-4 py-2 text-sm font-semibold text-ink hover:bg-white"
                onClick={() => setIsPickerOpen(true)}
              >
                <ListFilter size={16} />
                選擇市場清單
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedSymbols.length ? (
                selectedSymbols.slice(0, 14).map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
                    onClick={() => toggleSymbol(symbol)}
                  >
                    {symbol}
                    <X size={13} />
                  </button>
                ))
              ) : (
                <span className="text-sm text-white/55">尚未選擇清單標的，可加入自訂代號或開啟清單選擇。</span>
              )}
              {selectedSymbols.length > 14 ? <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/65">+{selectedSymbols.length - 14}</span> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
              onClick={() => setSelectedSymbols([...MARKET_WATCHLIST])}
            >
              全選清單
            </button>
            <button
              type="button"
              className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
              onClick={() => setSelectedSymbols(DEFAULT_SELECTED_SYMBOLS)}
            >
              回到預設
            </button>
            <button
              type="button"
              className="flex items-center gap-1 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
              onClick={() => setSelectedSymbols([])}
            >
              <X size={15} />
              清空
            </button>
          </div>

          <div className="rounded-lg border border-white/15 bg-black/25 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/55">
              <Search size={14} aria-hidden />
              自訂標的（可選，逗號分隔）
            </div>
            <label className="flex min-w-0 items-center gap-2 rounded-md bg-white px-3 py-2.5 text-ink">
              <Search size={18} className="shrink-0 text-ink/45" />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-ink/35"
                value={customSymbols}
                onChange={(event) => setCustomSymbols(event.target.value)}
                placeholder="例如 0050.TW, 2330.TW, AAPL, NVDA"
                aria-label="自訂查詢標的符號"
              />
            </label>
          </div>

          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-md bg-mint px-5 py-3 text-base font-semibold text-ink hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!submittedSymbols.length}
            onClick={submitMarketQuery}
          >
            <Send size={18} />
            送出查詢並前往分析頁
          </button>
        </div>
      </div>

      {isPickerOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-panel">
            <div className="flex items-start justify-between gap-4 border-b border-ink/10 p-4">
              <div>
                <p className="text-sm font-semibold text-pine">多選市場清單</p>
                <h2 className="mt-1 text-xl font-semibold">選擇要查詢的股市標的</h2>
                <p className="mt-1 text-sm text-ink/60">已選 {selectedSymbols.length} 檔，可全選、清空或依分類逐項選擇。</p>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md hover:bg-mist"
                onClick={() => setIsPickerOpen(false)}
                aria-label="關閉市場清單視窗"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-ink/10 p-4">
              <button
                type="button"
                className="rounded-md bg-pine px-3 py-2 text-sm font-semibold text-white hover:bg-ink"
                onClick={() => setSelectedSymbols([...MARKET_WATCHLIST])}
              >
                全選清單
              </button>
              <button
                type="button"
                className="rounded-md bg-mist px-3 py-2 text-sm font-semibold text-ink hover:bg-ink hover:text-white"
                onClick={() => setSelectedSymbols(DEFAULT_SELECTED_SYMBOLS)}
              >
                回到預設
              </button>
              <button
                type="button"
                className="flex items-center gap-1 rounded-md bg-mist px-3 py-2 text-sm font-semibold text-ink hover:bg-coral hover:text-white"
                onClick={() => setSelectedSymbols([])}
              >
                <X size={15} />
                清空
              </button>
            </div>

            <div className="border-b border-ink/10 p-4">
              <label className="flex items-center gap-2 rounded-md border border-ink/10 bg-mist px-3 py-2 text-ink">
                <Search size={16} className="shrink-0 text-ink/45" />
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-ink/35"
                  value={pickerQuery}
                  onChange={(event) => setPickerQuery(event.target.value)}
                  placeholder="搜尋代號或分類，例如 AAPL、2330、科技股"
                  aria-label="搜尋市場清單"
                />
              </label>
            </div>

            <div className="grid gap-4 overflow-y-auto p-4">
              {filteredGroups.map((group) => (
                <div key={group.title} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-pine">{group.title}</h3>
                    <button
                      type="button"
                      className="rounded-md bg-mist px-2 py-1 text-xs font-semibold text-ink/60 hover:bg-pine hover:text-white"
                      onClick={() => toggleGroup(group.symbols)}
                    >
                      {group.symbols.every((symbol) => selectedSet.has(symbol)) ? "取消本組" : "選取本組"}
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {group.symbols.map((symbol) => {
                      const checked = selectedSet.has(symbol);
                      return (
                        <button
                          key={symbol}
                          type="button"
                          className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-semibold transition ${
                            checked
                              ? "border-pine bg-mint text-ink"
                              : "border-ink/10 bg-white text-ink hover:border-pine/70 hover:bg-mist"
                          }`}
                          onClick={() => toggleSymbol(symbol)}
                        >
                          <span>{symbol}</span>
                          {checked ? <Check size={16} /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 bg-mist p-4">
              <span className="text-sm font-medium text-ink/65">目前已選 {selectedSymbols.length} 檔</span>
              <button
                type="button"
                className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-ink"
                onClick={() => setIsPickerOpen(false)}
              >
                完成選擇
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
