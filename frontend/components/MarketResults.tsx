"use client";

import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, ChevronDown, Clipboard, Heart, LineChart, Search, Target, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { MarketQuote, MarketSnapshot } from "@/lib/types";

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

function formatPlainPrice(value: number, digits = 4) {
  return value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatSigned(value: number, digits = 4) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
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

type QuoteTab = "chart" | "book" | "ticks" | "dividend";

function buildChartRows(quote: MarketQuote) {
  const source = quote.trend?.length ? quote.trend : [
    { label: "09:00", price: quote.open, changePercent: ((quote.open - quote.previousClose) / quote.previousClose) * 100, dayChangePercent: 0 },
    { label: "10:00", price: quote.high, changePercent: ((quote.high - quote.previousClose) / quote.previousClose) * 100, dayChangePercent: 0 },
    { label: "11:00", price: quote.low, changePercent: ((quote.low - quote.previousClose) / quote.previousClose) * 100, dayChangePercent: 0 },
    { label: "Now", price: quote.price, changePercent: quote.changePercent, dayChangePercent: 0 }
  ];
  const times = ["09", "10", "11", "12", "13", "14", "15", "16"];
  return source.map((point, index) => {
    const previous = source[index - 1]?.price ?? quote.previousClose;
    const change = point.price - quote.previousClose;
    const changePercent = quote.previousClose ? (change / quote.previousClose) * 100 : 0;
    const volumeBase = Math.max(1, quote.volume / Math.max(source.length, 1));
    const timeIndex = Math.round((index / Math.max(source.length - 1, 1)) * (times.length - 1));
    return {
      label: point.label === "Now" ? "16" : times[timeIndex] ?? point.label,
      price: point.price,
      change,
      changePercent,
      up: point.price >= previous,
      volume: Math.round(volumeBase * (0.35 + Math.abs(point.dayChangePercent ?? 0) * 0.28 + (index === source.length - 1 ? 1.2 : 0)))
    };
  });
}

function buildOrderBook(quote: MarketQuote) {
  const spread = Math.max(0.01, quote.price * 0.0015);
  return Array.from({ length: 5 }, (_, index) => {
    const level = index + 1;
    return {
      level,
      bid: quote.price - spread * level,
      ask: quote.price + spread * level,
      bidSize: Math.round((quote.volume / 1000) * (0.14 + index * 0.035)) || level * 8,
      askSize: Math.round((quote.volume / 1000) * (0.12 + index * 0.03)) || level * 7
    };
  });
}

function buildTicks(quote: MarketQuote) {
  const chartRows = buildChartRows(quote).slice(-8).reverse();
  return chartRows.map((row, index) => ({
    time: index === 0 ? "16:00" : `${15 - index}: ${index % 2 === 0 ? "45" : "15"}`.replace(" ", ""),
    price: row.price,
    change: row.change,
    changePercent: row.changePercent,
    volume: Math.max(1, Math.round(row.volume / 1000))
  }));
}

function QuoteDetailPanel({ quote, updatedAt }: { quote: MarketQuote; updatedAt: string }) {
  const [tab, setTab] = useState<QuoteTab>("chart");
  const [range, setRange] = useState("分時");
  const chartRows = useMemo(() => buildChartRows(quote), [quote]);
  const orderBook = useMemo(() => buildOrderBook(quote), [quote]);
  const ticks = useMemo(() => buildTicks(quote), [quote]);
  const isUp = quote.change >= 0;
  const tone = isUp ? "text-coral" : "text-pine";
  const stroke = isUp ? "#ef3340" : "#34b27c";
  const tabs: Array<{ key: QuoteTab; label: string }> = [
    { key: "chart", label: "K 線" },
    { key: "book", label: "五檔" },
    { key: "ticks", label: "明細" },
    { key: "dividend", label: "股利政策" }
  ];
  const ranges = ["分時", "日", "週", "月"];

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-3xl font-light text-ink/45 sm:text-4xl">‹</span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">{quote.name}</h2>
            <span className="mt-1 inline-flex rounded-md bg-mist px-2 py-1 text-xs font-semibold text-ink/50">{quote.symbol}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-ink/45">
          <Heart size={22} />
          <Search size={23} />
        </div>
      </div>

      <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-panel sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr] lg:items-start">
          <div>
            <div className="flex flex-wrap items-start gap-x-4 gap-y-2 sm:gap-x-7">
              <p className={`text-[3.25rem] font-light leading-none tracking-tight sm:text-7xl ${tone}`}>{formatPlainPrice(quote.price)}</p>
              <div className={`grid gap-1 pt-1 text-xl font-semibold sm:gap-2 sm:text-2xl ${tone}`}>
                <span>▲ {formatSigned(Math.abs(quote.change))}</span>
                <span>▲ {formatSigned(Math.abs(quote.changePercent), 2)}%</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink/45 sm:mt-6 sm:gap-3 sm:text-sm">
              <span className="rounded-full border border-ink/10 px-3 py-1.5 text-ink/55 sm:px-4 sm:py-2">延遲 15 分鐘</span>
              <span>更新時間 {updatedAt}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-base sm:gap-x-8 sm:gap-y-4 sm:text-xl">
            <div>
              <span className="text-ink/55">最高</span>
              <span className="ml-3 text-coral">{formatPlainPrice(quote.high)}</span>
            </div>
            <div>
              <span className="text-ink/55">昨收</span>
              <span className="ml-3 text-ink">{formatPlainPrice(quote.previousClose)}</span>
            </div>
            <div>
              <span className="text-ink/55">最低</span>
              <span className="ml-3 text-pine">{formatPlainPrice(quote.low)}</span>
            </div>
            <div>
              <span className="text-ink/55">開盤</span>
              <span className="ml-3 text-coral">{formatPlainPrice(quote.open)}</span>
            </div>
            <div>
              <span className="text-ink/55">成交量</span>
              <span className="ml-3 text-ink">{compact.format(quote.volume)}</span>
            </div>
            <div>
              <span className="text-ink/55">股息率</span>
              <span className="ml-3 text-ink">{quote.dividendYield !== null ? `${(quote.dividendYield * 100).toFixed(2)}%` : "—"}</span>
            </div>
          </div>
        </div>
        <ChevronDown className="mx-auto mt-3 text-ink/35" />
      </div>

      <div className="border-b border-line">
        <div className="grid grid-cols-4 text-center text-base font-semibold text-ink/60 sm:text-lg">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`border-b-4 px-1 py-3 transition sm:px-2 sm:py-4 ${tab === item.key ? "border-mint text-pine" : "border-transparent hover:bg-white/60"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "chart" ? (
        <div className="grid gap-4 rounded-lg border border-ink/10 bg-white p-3 shadow-panel sm:p-4">
          <div className="grid grid-cols-4 items-center gap-2 text-center text-base text-ink/60 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto] sm:text-lg">
            {ranges.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className={`rounded-md px-2 py-3 font-semibold sm:px-3 ${range === item ? "bg-mint text-white" : "hover:bg-mist"}`}
              >
                {item}
              </button>
            ))}
            <button type="button" className="col-span-3 inline-flex items-center justify-center gap-1 rounded-md px-3 py-3 font-semibold hover:bg-mist sm:col-span-1">
              60 分鐘 <ChevronDown size={18} />
            </button>
            <span className="grid h-full place-items-center rounded-md text-2xl text-pine hover:bg-mist">↗</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
            <span className="text-ink/55">16:00</span>
            <span className={tone}>… {formatPlainPrice(quote.price)} ▲ {formatSigned(Math.abs(quote.change))}({formatSigned(Math.abs(quote.changePercent), 2)}%)</span>
            <span>量:{Math.max(1, Math.round(quote.volume / 1_000_000))}</span>
          </div>
          <div className="h-[300px] w-full sm:h-[430px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartRows} margin={{ top: 20, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="6 8" stroke="#dfe5e2" />
                <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={22} tick={{ fontSize: 12, fill: "#28342f" }} />
                <YAxis yAxisId="price" domain={["dataMin - 8", "dataMax + 8"]} tick={{ fontSize: 12, fill: "#28342f" }} width={52} tickFormatter={(value) => Number(value).toFixed(1)} />
                <YAxis yAxisId="volume" orientation="right" hide domain={[0, "dataMax * 4"]} />
                <Tooltip formatter={(value: number, name: string) => [name === "成交量" ? compact.format(value) : formatPlainPrice(value), name]} />
                <Bar yAxisId="volume" dataKey="volume" name="成交量" barSize={5} isAnimationActive={false}>
                  {chartRows.map((entry, index) => (
                    <Cell key={index} fill={entry.up ? "#ffd33f" : "#ffe071"} />
                  ))}
                </Bar>
                <Line yAxisId="price" type="monotone" dataKey="price" name="價格" stroke={stroke} strokeWidth={2.2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {tab === "book" ? (
        <div className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-panel sm:p-5">
          <div className="grid grid-cols-5 border-b border-line pb-2 text-sm font-semibold text-ink/45">
            <span>檔位</span>
            <span className="text-pine">買價</span>
            <span>買量</span>
            <span className="text-coral">賣價</span>
            <span>賣量</span>
          </div>
          {orderBook.map((row) => (
            <div key={row.level} className="grid grid-cols-5 items-center rounded-md bg-mist/50 px-3 py-3 text-base sm:text-lg">
              <span>{row.level}</span>
              <span className="text-pine">{formatPlainPrice(row.bid)}</span>
              <span>{row.bidSize}</span>
              <span className="text-coral">{formatPlainPrice(row.ask)}</span>
              <span>{row.askSize}</span>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "ticks" ? (
        <div className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-panel sm:p-5">
          <div className="grid grid-cols-4 border-b border-line pb-2 text-sm font-semibold text-ink/45">
            <span>時間</span>
            <span>成交價</span>
            <span>漲跌</span>
            <span>量</span>
          </div>
          {ticks.map((row) => (
            <div key={row.time} className="grid grid-cols-4 rounded-md bg-mist/50 px-3 py-3 text-sm sm:text-lg">
              <span>{row.time}</span>
              <span className={row.change >= 0 ? "text-coral" : "text-pine"}>{formatPlainPrice(row.price)}</span>
              <span className={row.change >= 0 ? "text-coral" : "text-pine"}>{formatSigned(row.change)} ({formatSigned(row.changePercent, 2)}%)</span>
              <span>{row.volume}</span>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "dividend" ? (
        <div className="grid gap-4 rounded-lg border border-ink/10 bg-white p-4 shadow-panel sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-mist p-4">
              <p className="text-sm text-ink/45">現金殖利率</p>
              <p className="mt-2 text-3xl font-semibold text-pine">{quote.dividendYield !== null ? `${(quote.dividendYield * 100).toFixed(2)}%` : "—"}</p>
            </div>
            <div className="rounded-lg bg-mist p-4">
              <p className="text-sm text-ink/45">估計年度配息</p>
              <p className="mt-2 text-3xl font-semibold">{quote.dividendYield !== null ? formatPlainPrice(quote.price * quote.dividendYield, 2) : "—"}</p>
            </div>
            <div className="rounded-lg bg-mist p-4">
              <p className="text-sm text-ink/45">資料來源</p>
              <p className="mt-2 text-3xl font-semibold">{quote.source}</p>
            </div>
          </div>
          <p className="text-sm leading-6 text-ink/55">股利資訊依目前報價資料估算，實際除息日、配息金額與配息頻率仍應以交易所與發行公司公告為準。</p>
        </div>
      ) : null}
    </section>
  );
}

export function MarketResults({ snapshot }: { snapshot: MarketSnapshot }) {
  const quotes = useMemo(() => snapshot.quotes, [snapshot]);
  const [selected, setSelected] = useState(quotes[0]?.symbol ?? "");
  const [signalFilter, setSignalFilter] = useState<"all" | MarketQuote["signal"]>("all");
  const [sortBy, setSortBy] = useState<"change" | "volume" | "dividend" | "symbol">("change");
  const [copyState, setCopyState] = useState<"idle" | "done" | "error">("idle");
  const selectedQuote = quotes.find((quote) => quote.symbol === selected) ?? quotes[0];
  const maxVolume = quotes.length ? Math.max(...quotes.map((quote) => quote.volume), 1) : 1;
  const filteredQuotes = useMemo(() => {
    const nextQuotes = signalFilter === "all" ? quotes : quotes.filter((quote) => quote.signal === signalFilter);
    return [...nextQuotes].sort((a, b) => {
      if (sortBy === "volume") return b.volume - a.volume;
      if (sortBy === "dividend") return (b.dividendYield ?? 0) - (a.dividendYield ?? 0);
      if (sortBy === "symbol") return a.symbol.localeCompare(b.symbol);
      return b.changePercent - a.changePercent;
    });
  }, [quotes, signalFilter, sortBy]);
  const positiveCount = quotes.filter((quote) => quote.changePercent >= 0).length;
  const averageChange = quotes.length ? quotes.reduce((sum, quote) => sum + quote.changePercent, 0) / quotes.length : 0;
  const strongest = [...quotes].sort((a, b) => b.changePercent - a.changePercent)[0];
  const weakest = [...quotes].sort((a, b) => a.changePercent - b.changePercent)[0];
  const updatedAt = formatUpdatedAt(snapshot.updatedAt);
  const summaryText = [
    `CashFlow 市場摘要（${updatedAt}）`,
    snapshot.summary,
    `平均漲跌：${averageChange >= 0 ? "+" : ""}${averageChange.toFixed(2)}%`,
    `最強標的：${strongest?.symbol ?? "N/A"} ${strongest ? `${strongest.changePercent >= 0 ? "+" : ""}${strongest.changePercent.toFixed(2)}%` : ""}`,
    `需留意：${weakest?.symbol ?? "N/A"} ${weakest ? `${weakest.changePercent >= 0 ? "+" : ""}${weakest.changePercent.toFixed(2)}%` : ""}`,
    ...quotes.map((quote) => `${quote.symbol}: ${formatInstrumentMoney(quote, quote.price)} / ${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}% / ${quote.signal}`)
  ].join("\n");
  const signalTabs: Array<{ value: "all" | MarketQuote["signal"]; label: string }> = [
    { value: "all", label: "全部" },
    { value: "bullish", label: "偏多" },
    { value: "neutral", label: "中性" },
    { value: "caution", label: "謹慎" }
  ];

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyState("done");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-lg border border-ink/10 bg-ink p-4 text-white shadow-panel sm:p-5" data-ai-context>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-mint">查詢結果</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:mt-2 sm:text-3xl">所選市場分析</h1>
            <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-relaxed text-white/75 sm:line-clamp-none">{snapshot.summary}</p>
          </div>
          <div className="rounded-md bg-white/10 px-3 py-2 text-xs font-medium text-white/75">
            共 {quotes.length} 檔，資料來源：{snapshot.source}，更新 {updatedAt}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-xs font-semibold text-white/50">市場結論</p>
            <p className={`mt-1 text-lg font-semibold ${averageChange >= 0 ? "text-mint" : "text-coral"}`}>
              {averageChange >= 0 ? "偏多觀察" : "保守觀察"}
            </p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-xs font-semibold text-white/50">先看標的</p>
            <p className="mt-1 text-lg font-semibold text-white">{selectedQuote?.symbol ?? strongest?.symbol ?? "—"}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-xs font-semibold text-white/50">建議動作</p>
            <p className="mt-1 text-lg font-semibold text-mint">比較動能與股息</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-ink/10 bg-white p-3 shadow-panel sm:p-4">
          <p className="text-xs font-semibold text-ink/45">上漲家數</p>
          <p className="mt-1 text-xl font-semibold sm:mt-2 sm:text-2xl">{positiveCount}/{quotes.length}</p>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-3 shadow-panel sm:p-4">
          <p className="text-xs font-semibold text-ink/45">平均漲跌</p>
          <p className={`mt-1 text-xl font-semibold sm:mt-2 sm:text-2xl ${averageChange >= 0 ? "text-pine" : "text-coral"}`}>
            {averageChange >= 0 ? "+" : ""}
            {averageChange.toFixed(2)}%
          </p>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-3 shadow-panel sm:p-4">
          <p className="text-xs font-semibold text-ink/45">最強標的</p>
          <p className="mt-1 truncate text-xl font-semibold text-pine sm:mt-2 sm:text-2xl">{strongest?.symbol ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-3 shadow-panel sm:p-4">
          <p className="text-xs font-semibold text-ink/45">需留意</p>
          <p className="mt-1 truncate text-xl font-semibold text-coral sm:mt-2 sm:text-2xl">{weakest?.symbol ?? "—"}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-ink/10 bg-white p-3 shadow-panel sm:p-4" data-ai-context>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Target size={17} className="text-pine" />
            先聚焦一檔，再看價格與圖表
          </div>
          <Link
            href={`/stock?symbol=${encodeURIComponent(selectedQuote?.symbol ?? strongest?.symbol ?? "")}`}
            className="inline-flex min-h-10 items-center gap-1 rounded-md bg-mist px-3 py-2 text-xs font-semibold text-ink/65 hover:bg-pine hover:text-white"
          >
            基本面深度分析
            <ArrowRight size={13} />
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quotes.map((quote) => (
            <button
              key={quote.symbol}
              type="button"
              className={`min-h-11 shrink-0 rounded-md border px-3 py-2 text-left text-sm font-semibold ${
                selectedQuote?.symbol === quote.symbol
                  ? "border-pine bg-pine text-white"
                  : "border-line bg-mist text-ink/65 hover:border-pine/40 hover:bg-white"
              }`}
              onClick={() => setSelected(quote.symbol)}
            >
              <span>{quote.symbol}</span>
              <span className={`ml-2 ${selectedQuote?.symbol === quote.symbol ? "text-white/75" : quote.changePercent >= 0 ? "text-pine" : "text-coral"}`}>
                {quote.changePercent >= 0 ? "+" : ""}
                {quote.changePercent.toFixed(2)}%
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedQuote ? <QuoteDetailPanel quote={selectedQuote} updatedAt={updatedAt} /> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-4">
          <div className="sticky top-[61px] z-30 -mx-4 flex flex-wrap items-center justify-between gap-3 border-y border-line/70 bg-mist/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {signalTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`min-h-11 shrink-0 rounded-md px-4 py-2 text-sm font-semibold ${
                    signalFilter === tab.value ? "bg-pine text-white" : "bg-white text-ink/65 shadow-panel hover:bg-mist"
                  }`}
                  onClick={() => setSignalFilter(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex w-full gap-2 sm:w-auto sm:flex-wrap">
              <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-ink/65 shadow-panel sm:flex-none">
                排序
                <select
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                >
                  <option value="change">漲跌幅</option>
                  <option value="volume">成交量</option>
                  <option value="dividend">股息率</option>
                  <option value="symbol">代號</option>
                </select>
              </label>
              <button
                type="button"
                className="flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-ink/65 shadow-panel hover:bg-mist"
                onClick={copySummary}
              >
                <Clipboard size={15} />
                {copyState === "done" ? "已複製" : copyState === "error" ? "無法複製" : "複製摘要"}
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-4">
            {filteredQuotes.map((quote) => {
              const isPositive = quote.changePercent >= 0;
              const volumeScore = (quote.volume / maxVolume) * 100;

              return (
                <button
                  key={quote.symbol}
                  className={`grid w-full gap-2 rounded-lg border p-3 text-left shadow-panel transition hover:-translate-y-0.5 hover:border-pine/50 sm:min-h-[214px] sm:gap-3 sm:p-4 ${
                    selectedQuote?.symbol === quote.symbol ? "border-pine bg-mist" : "border-ink/10 bg-white"
                  }`}
                  onClick={() => setSelected(quote.symbol)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{quote.symbol}</span>
                        {isPositive ? <TrendingUp size={16} className="text-pine" /> : <TrendingDown size={16} className="text-coral" />}
                      </div>
                      <p className="mt-1 truncate text-xs text-ink/55">{quote.name}</p>
                    </div>
                    <SignalBadge signal={quote.signal} />
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-xl font-semibold sm:text-2xl">{formatInstrumentMoney(quote, quote.price)}</span>
                    <span className={`font-semibold ${isPositive ? "text-pine" : "text-coral"}`}>
                      {isPositive ? "+" : ""}
                      {quote.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="hidden sm:block">
                    <TrendSparkline quote={quote} />
                  </div>
                  <div className="hidden sm:block">
                    <RangeMeter quote={quote} />
                  </div>
                  <div className="hidden sm:block">
                    <MetricBar label="成交量壓力" value={volumeScore} tone={isPositive ? "pine" : "coral"} />
                  </div>
                  <div className="grid grid-cols-2 gap-1 border-t border-ink/10 pt-2 text-[11px] text-ink/55 sm:gap-2 sm:pt-3">
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
              <Link
                href={`/stock?symbol=${encodeURIComponent(selectedQuote.symbol)}`}
                className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-ink"
              >
                <LineChart size={16} />
                查看基本面深度分析
              </Link>
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
