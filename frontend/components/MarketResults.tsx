"use client";

import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import type { MarketQuote, MarketSnapshot } from "@/lib/types";
import { MarketScene3D } from "./MarketScene3D";

const twdFormatter = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 2
});

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1
});

function formatInstrumentMoney(_quote: Pick<MarketQuote, "symbol" | "tradeCurrency">, value: number) {
  return `NT$${twdFormatter.format(value)}`;
}

function SignalBadge({ signal }: { signal: MarketQuote["signal"] }) {
  const styles = {
    bullish: "bg-mint/35 text-pine",
    neutral: "bg-gold/20 text-ink",
    caution: "bg-coral/20 text-coral"
  };
  const labels = {
    bullish: "偏多",
    neutral: "中性",
    caution: "謹慎"
  };

  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${styles[signal]}`}>{labels[signal]}</span>;
}

function RangeMeter({ quote }: { quote: MarketQuote }) {
  const position = quote.high <= quote.low ? 50 : ((quote.price - quote.low) / (quote.high - quote.low)) * 100;

  return (
    <div className="grid gap-1">
      <div className="h-2 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-pine" style={{ width: `${Math.max(4, Math.min(position, 100))}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-ink/45">
        <span>低點</span>
        <span>{Math.round(position)}% 區間</span>
        <span>高點</span>
      </div>
    </div>
  );
}

function MetricBar({ label, value, tone = "pine" }: { label: string; value: number; tone?: "pine" | "coral" | "gold" }) {
  const colors = {
    pine: "bg-pine",
    coral: "bg-coral",
    gold: "bg-gold"
  };

  return (
    <div className="grid gap-2">
      <div className="flex justify-between text-xs font-medium text-ink/55">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/10">
        <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${Math.max(3, Math.min(value, 100))}%` }} />
      </div>
    </div>
  );
}

function TrendSparkline({ quote }: { quote: MarketQuote }) {
  const rawPoints = quote.trend?.length ? quote.trend : [
    { label: "Open", price: quote.open, changePercent: ((quote.open - quote.previousClose) / quote.previousClose) * 100, dayChangePercent: 0 },
    { label: "Low", price: quote.low, changePercent: ((quote.low - quote.previousClose) / quote.previousClose) * 100, dayChangePercent: ((quote.low - quote.open) / quote.open) * 100 },
    { label: "High", price: quote.high, changePercent: ((quote.high - quote.previousClose) / quote.previousClose) * 100, dayChangePercent: ((quote.high - quote.low) / quote.low) * 100 },
    { label: "Now", price: quote.price, changePercent: quote.changePercent, dayChangePercent: ((quote.price - quote.high) / quote.high) * 100 }
  ];
  const points = rawPoints.map((point, index) => {
    const previous = rawPoints[index - 1];
    const safePrice = Number.isFinite(point.price) ? point.price : quote.price;
    const previousPrice = previous && Number.isFinite(previous.price) ? previous.price : safePrice;
    const fallbackDayChange = index === 0 || !previousPrice ? 0 : ((safePrice - previousPrice) / previousPrice) * 100;
    const dayChange = Number.isFinite(point.dayChangePercent) ? point.dayChangePercent : fallbackDayChange;
    return {
      ...point,
      price: safePrice,
      changePercent: Number.isFinite(point.changePercent) ? point.changePercent : 0,
      dayChangePercent: Number.isFinite(dayChange) ? dayChange : 0
    };
  });
  const values = points.map((point) => point.changePercent);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 320;
  const height = 112;
  const paddingX = 6;
  const paddingTop = 10;
  const lineBottom = 70;
  const barTop = 80;
  const barBaseline = 96;
  const coordinates = points.map((point, index) => ({
    x: paddingX + (index / Math.max(points.length - 1, 1)) * (width - paddingX * 2),
    y: paddingTop + ((max - point.changePercent) / range) * (lineBottom - paddingTop),
    point
  }));
  const path = coordinates.map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const areaPath = `${path} L ${width - paddingX} ${lineBottom} L ${paddingX} ${lineBottom} Z`;
  const tone = quote.changePercent >= 0 ? "text-pine" : "text-coral";
  const stroke = quote.changePercent >= 0 ? "#1f7662" : "#d96f5d";
  const fill = quote.changePercent >= 0 ? "rgba(31,118,98,0.13)" : "rgba(217,111,93,0.13)";
  const latest = points[points.length - 1];
  const first = points[0];
  const middle = points[Math.floor(points.length / 2)];
  const upDays = points.filter((point) => point.dayChangePercent > 0).length;
  const downDays = points.filter((point) => point.dayChangePercent < 0).length;
  const maxAbsDayChange = Math.max(...points.map((point) => Math.abs(point.dayChangePercent)).filter(Number.isFinite), 1);

  return (
    <div className="rounded-md bg-white/60 p-2 ring-1 ring-ink/5">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold">
        <span className="text-ink/55">近 30 日漲跌</span>
        <span className={tone}>
          {latest.changePercent >= 0 ? "+" : ""}
          {latest.changePercent.toFixed(2)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[112px] w-full" role="img" aria-label={`${quote.symbol} 近期漲跌折線圖`}>
        <defs>
          <linearGradient id={`trend-${quote.symbol.replace(/[^a-zA-Z0-9]/g, "-")}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={fill} />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <line x1={paddingX} x2={width - paddingX} y1={lineBottom} y2={lineBottom} stroke="rgba(23,32,29,0.12)" />
        <line x1={paddingX} x2={width - paddingX} y1={paddingTop} y2={paddingTop} stroke="rgba(23,32,29,0.08)" strokeDasharray="4 5" />
        <line x1={paddingX} x2={width - paddingX} y1={barBaseline} y2={barBaseline} stroke="rgba(23,32,29,0.12)" />
        <path d={areaPath} fill={`url(#trend-${quote.symbol.replace(/[^a-zA-Z0-9]/g, "-")})`} />
        {coordinates.slice(1).map((current, index) => {
          const previous = coordinates[index];
          const dayChange = current.point.dayChangePercent;
          return (
            <line
              key={`${current.point.label}-${index}`}
              x1={previous.x}
              y1={previous.y}
              x2={current.x}
              y2={current.y}
              stroke={dayChange >= 0 ? "#1f7662" : "#d96f5d"}
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        })}
        {points.map((point, index) => {
          const x = paddingX + (index / Math.max(points.length - 1, 1)) * (width - paddingX * 2);
          const normalizedBarHeight = (Math.abs(point.dayChangePercent) / maxAbsDayChange) * 14;
          const barHeight = Number.isFinite(normalizedBarHeight) ? Math.max(2, normalizedBarHeight) : 2;
          const isUp = point.dayChangePercent >= 0;
          return (
            <rect
              key={`${point.label}-bar`}
              x={x - 2}
              y={isUp ? barBaseline - barHeight : barBaseline}
              width="4"
              height={barHeight}
              rx="1.5"
              fill={isUp ? "#1f7662" : "#d96f5d"}
              opacity={index === 0 ? 0.18 : 0.72}
            />
          );
        })}
        <circle
          cx={coordinates[coordinates.length - 1].x}
          cy={coordinates[coordinates.length - 1].y}
          r="4"
          fill={stroke}
          stroke="white"
          strokeWidth="2"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-medium text-ink/45">
        <span>{first.label}</span>
        <span>{middle.label}</span>
        <span>{latest.label}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-semibold text-ink/50">
        <span className="text-pine">漲 {upDays} 天</span>
        <span>{formatInstrumentMoney(quote, latest.price)}</span>
        <span className="text-coral">跌 {downDays} 天</span>
      </div>
    </div>
  );
}

export function MarketResults({ snapshot }: { snapshot: MarketSnapshot }) {
  const quotes = useMemo(() => snapshot.quotes, [snapshot]);
  const [selected, setSelected] = useState(quotes[0]?.symbol ?? "");
  const [signalFilter, setSignalFilter] = useState<"all" | MarketQuote["signal"]>("all");
  const selectedQuote = quotes.find((quote) => quote.symbol === selected) ?? quotes[0];
  const maxVolume = quotes.length ? Math.max(...quotes.map((quote) => quote.volume), 1) : 1;
  const filteredQuotes = signalFilter === "all" ? quotes : quotes.filter((quote) => quote.signal === signalFilter);
  const positiveCount = quotes.filter((quote) => quote.changePercent >= 0).length;
  const averageChange = quotes.length ? quotes.reduce((sum, quote) => sum + quote.changePercent, 0) / quotes.length : 0;
  const strongest = [...quotes].sort((a, b) => b.changePercent - a.changePercent)[0];
  const weakest = [...quotes].sort((a, b) => a.changePercent - b.changePercent)[0];
  const signalTabs: Array<{ value: "all" | MarketQuote["signal"]; label: string }> = [
    { value: "all", label: "全部" },
    { value: "bullish", label: "偏多" },
    { value: "neutral", label: "中性" },
    { value: "caution", label: "謹慎" }
  ];

  return (
    <section className="grid gap-4">
      <div className="rounded-lg border border-ink/10 bg-ink p-5 text-white shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-mint">查詢結果</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">所選市場分析</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/75">{snapshot.summary}</p>
          </div>
          <div className="rounded-md bg-white/10 px-3 py-2 text-xs font-medium text-white/75">
            共 {quotes.length} 檔，資料來源：{snapshot.source}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-panel">
          <p className="text-xs font-semibold text-ink/45">上漲家數</p>
          <p className="mt-2 text-2xl font-semibold">{positiveCount}/{quotes.length}</p>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-panel">
          <p className="text-xs font-semibold text-ink/45">平均漲跌</p>
          <p className={`mt-2 text-2xl font-semibold ${averageChange >= 0 ? "text-pine" : "text-coral"}`}>
            {averageChange >= 0 ? "+" : ""}
            {averageChange.toFixed(2)}%
          </p>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-panel">
          <p className="text-xs font-semibold text-ink/45">最強標的</p>
          <p className="mt-2 text-2xl font-semibold text-pine">{strongest?.symbol ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-panel">
          <p className="text-xs font-semibold text-ink/45">需留意</p>
          <p className="mt-2 text-2xl font-semibold text-coral">{weakest?.symbol ?? "—"}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-4">
          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-panel">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-pine" />
                <h2 className="text-lg font-semibold">3D 市場地圖</h2>
              </div>
              <div className="flex gap-2 text-xs font-semibold text-ink/50">
                <span>價格</span>
                <span>動能</span>
                <span>成交量</span>
              </div>
            </div>
            <MarketScene3D quotes={quotes} selectedSymbol={selectedQuote?.symbol} />
          </div>

          <div className="flex flex-wrap gap-2">
            {signalTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`rounded-md px-3 py-2 text-sm font-semibold ${
                  signalFilter === tab.value ? "bg-pine text-white" : "bg-white text-ink/65 shadow-panel hover:bg-mist"
                }`}
                onClick={() => setSignalFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {filteredQuotes.map((quote) => {
              const isPositive = quote.changePercent >= 0;
              const volumeScore = (quote.volume / maxVolume) * 100;

              return (
                <button
                  key={quote.symbol}
                  className={`grid min-h-[214px] w-full gap-3 rounded-lg border p-4 text-left shadow-panel transition hover:-translate-y-0.5 hover:border-pine/50 ${
                    selectedQuote?.symbol === quote.symbol ? "border-pine bg-mist" : "border-ink/10 bg-white"
                  }`}
                  onClick={() => setSelected(quote.symbol)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{quote.symbol}</span>
                        {isPositive ? <TrendingUp size={16} className="text-pine" /> : <TrendingDown size={16} className="text-coral" />}
                      </div>
                      <p className="mt-1 text-xs text-ink/55">{quote.name}</p>
                    </div>
                    <SignalBadge signal={quote.signal} />
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-2xl font-semibold">{formatInstrumentMoney(quote, quote.price)}</span>
                    <span className={`font-semibold ${isPositive ? "text-pine" : "text-coral"}`}>
                      {isPositive ? "+" : ""}
                      {quote.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <TrendSparkline quote={quote} />
                  <RangeMeter quote={quote} />
                  <MetricBar label="成交量壓力" value={volumeScore} tone={isPositive ? "pine" : "coral"} />
                  <div className="grid grid-cols-2 gap-2 border-t border-ink/10 pt-3 text-[11px] text-ink/55">
                    <span>開盤 {formatInstrumentMoney(quote, quote.open)}</span>
                    <span>昨收 {formatInstrumentMoney(quote, quote.previousClose)}</span>
                    <span>最高 {formatInstrumentMoney(quote, quote.high)}</span>
                    <span>最低 {formatInstrumentMoney(quote, quote.low)}</span>
                    <span>量 {compact.format(quote.volume)}</span>
                    <span>股息 {quote.dividendYield !== null ? `${(quote.dividendYield * 100).toFixed(2)}%` : "N/A"}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {!filteredQuotes.length ? (
            <div className="rounded-lg border border-dashed border-ink/15 bg-white p-8 text-center text-sm text-ink/55">此篩選條件目前沒有標的。</div>
          ) : null}
        </div>

        <aside className="rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
          {selectedQuote ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink/55">選取標的</p>
                  <h2 className="mt-1 text-2xl font-semibold">{selectedQuote.symbol}</h2>
                </div>
                <SignalBadge signal={selectedQuote.signal} />
              </div>
              <p className="mt-4 text-sm leading-6 text-ink/65">{selectedQuote.analysis}</p>
              <div className="mt-5 grid gap-4">
                <div className="rounded-lg bg-mist p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">日內位置</span>
                    <span className="text-sm font-semibold text-pine">{formatInstrumentMoney(selectedQuote, selectedQuote.price)}</span>
                  </div>
                  <RangeMeter quote={selectedQuote} />
                </div>
                <div className="grid gap-3 rounded-lg bg-mist p-4">
                  <MetricBar
                    label="動能"
                    value={Math.min(100, Math.abs(selectedQuote.changePercent) * 28)}
                    tone={selectedQuote.changePercent >= 0 ? "pine" : "coral"}
                  />
                  <MetricBar label="成交量" value={(selectedQuote.volume / maxVolume) * 100} tone="gold" />
                  <MetricBar
                    label="收益率"
                    value={Math.min(100, (selectedQuote.dividendYield ?? 0) * 1400)}
                    tone={(selectedQuote.dividendYield ?? 0) > 0.02 ? "pine" : "gold"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-ink/10 p-3">
                    <span className="text-ink/50">開盤</span>
                    <p className="mt-1 font-semibold">{formatInstrumentMoney(selectedQuote, selectedQuote.open)}</p>
                  </div>
                  <div className="rounded-lg border border-ink/10 p-3">
                    <span className="text-ink/50">昨收</span>
                    <p className="mt-1 font-semibold">{formatInstrumentMoney(selectedQuote, selectedQuote.previousClose)}</p>
                  </div>
                  <div className="rounded-lg border border-ink/10 p-3">
                    <span className="text-ink/50">今日最高</span>
                    <p className="mt-1 font-semibold">{formatInstrumentMoney(selectedQuote, selectedQuote.high)}</p>
                  </div>
                  <div className="rounded-lg border border-ink/10 p-3">
                    <span className="text-ink/50">今日最低</span>
                    <p className="mt-1 font-semibold">{formatInstrumentMoney(selectedQuote, selectedQuote.low)}</p>
                  </div>
                  <div className="rounded-lg border border-ink/10 p-3">
                    <span className="text-ink/50">成交量</span>
                    <p className="mt-1 font-semibold">{compact.format(selectedQuote.volume)}</p>
                  </div>
                  <div className="rounded-lg border border-ink/10 p-3">
                    <span className="text-ink/50">P/E</span>
                    <p className="mt-1 font-semibold">{selectedQuote.peRatio ? selectedQuote.peRatio.toFixed(1) : "N/A"}</p>
                  </div>
                  <div className="rounded-lg border border-ink/10 p-3">
                    <span className="text-ink/50">股息率</span>
                    <p className="mt-1 font-semibold">
                      {selectedQuote.dividendYield !== null ? `${(selectedQuote.dividendYield * 100).toFixed(2)}%` : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
