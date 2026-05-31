"""Phase 4:量化引擎 —— 回測 + 選股器。

回測(以真實日線):
- buy_and_hold:買進持有
- sma_cross:短/長均線黃金交叉做多、死亡交叉空手(僅多單)
- dca:定期定額(每月投入固定金額)

績效:總報酬、CAGR、最大回撤、年化波動、夏普、月勝率,並與買進持有基準比較。

選股器:對精選股票池跑基本面(+台股籌碼)評分,依條件篩選與排序。

本檔僅做分析,不提供投資建議。
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import numpy as np

from app.config import Settings
from app.schemas import (
    BacktestMetrics,
    BacktestRequest,
    BacktestResult,
    EquityPoint,
    ScreenerRequest,
    ScreenerResult,
    ScreenerRow,
)
from app.services import chip_engine, fundamental_engine
from app.services.data_providers import finmind_client, yfinance_client

TRADING_DAYS = 252

STRATEGY_LABELS = {
    "buy_and_hold": "買進持有",
    "sma_cross": "均線交叉",
    "dca": "定期定額",
}

# 選股精選股票池(控制免費 API 用量)。
TW_UNIVERSE = [
    "2330", "2317", "2454", "2308", "2382", "2303",
    "2881", "2412", "3711", "0050", "0056", "00878",
]
US_UNIVERSE = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "AVGO", "SCHD"]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _price_history(symbol: str, settings: Settings, years: int) -> list[dict]:
    if finmind_client.is_taiwan_symbol(symbol):
        return await finmind_client.get_price_history(symbol, settings.finmind_token, years=years)
    period = f"{min(max(years, 1), 10)}y"
    return await yfinance_client.get_price_history(symbol, period=period)


# ---------------- 回測 ----------------

def _metrics_from_equity(dates: list[str], equity: np.ndarray, initial: float, years: float) -> BacktestMetrics:
    final = float(equity[-1])
    total_return = (final / initial - 1) * 100 if initial > 0 else 0.0
    cagr = ((final / initial) ** (1 / years) - 1) * 100 if initial > 0 and years > 0 and final > 0 else 0.0

    # 最大回撤
    running_max = np.maximum.accumulate(equity)
    drawdowns = (equity - running_max) / running_max
    max_dd = float(drawdowns.min()) * 100 if len(drawdowns) else 0.0

    # 日報酬 → 年化波動與夏普
    daily = np.diff(equity) / equity[:-1]
    daily = daily[np.isfinite(daily)]
    vol = float(np.std(daily)) * np.sqrt(TRADING_DAYS) * 100 if len(daily) > 1 else 0.0
    sharpe = (
        float(np.mean(daily) / np.std(daily)) * np.sqrt(TRADING_DAYS)
        if len(daily) > 1 and np.std(daily) > 0
        else 0.0
    )

    # 月勝率(以月底權益計算月報酬)
    month_last: dict[str, float] = {}
    for d, v in zip(dates, equity):
        month_last[d[:7]] = float(v)
    monthly_vals = [month_last[k] for k in sorted(month_last)]
    monthly_rets = np.diff(monthly_vals) / np.array(monthly_vals[:-1]) if len(monthly_vals) > 1 else np.array([])
    win_rate = float(np.mean(monthly_rets > 0)) * 100 if len(monthly_rets) else 0.0

    return BacktestMetrics(
        totalReturnPercent=round(total_return, 2),
        cagrPercent=round(cagr, 2),
        maxDrawdownPercent=round(max_dd, 2),
        volatilityPercent=round(vol, 2),
        sharpe=round(sharpe, 2),
        winRatePercent=round(win_rate, 1),
    )


def _run_strategy(req: BacktestRequest, closes: np.ndarray) -> tuple[np.ndarray, np.ndarray, float, int]:
    """回傳 (策略權益, 基準權益, 初始投入, 交易次數)。"""
    n = len(closes)
    base = closes[0]
    benchmark = req.initialCapital * (closes / base)

    if req.strategy == "buy_and_hold":
        return benchmark.copy(), benchmark, req.initialCapital, 0

    if req.strategy == "sma_cross":
        short_w, long_w = req.smaShort, req.smaLong
        if short_w >= long_w:
            short_w, long_w = min(req.smaShort, req.smaLong), max(req.smaShort, req.smaLong) + 1

        def sma(arr: np.ndarray, w: int) -> np.ndarray:
            out = np.full(len(arr), np.nan)
            if len(arr) >= w:
                c = np.cumsum(np.insert(arr, 0, 0))
                out[w - 1 :] = (c[w:] - c[:-w]) / w
            return out

        s_short, s_long = sma(closes, short_w), sma(closes, long_w)
        position = np.zeros(n)
        for i in range(1, n):
            if np.isnan(s_short[i]) or np.isnan(s_long[i]):
                position[i] = 0
            else:
                position[i] = 1.0 if s_short[i] > s_long[i] else 0.0
        daily_ret = np.zeros(n)
        daily_ret[1:] = (closes[1:] - closes[:-1]) / closes[:-1]
        strat_ret = position[:-1] * daily_ret[1:]  # 用前一日訊號
        equity = req.initialCapital * np.cumprod(np.insert(1 + strat_ret, 0, 1.0))
        trades = int(np.sum(np.abs(np.diff(position)) > 0))
        return equity, benchmark, req.initialCapital, trades

    # dca:每月第一個交易日投入固定金額
    shares = 0.0
    contributed = 0.0
    seen_month: set[str] = set()
    equity = np.zeros(n)
    # dates 由呼叫端控制月份;此處用 index 對應,於 backtest() 傳入月份標記
    return equity, benchmark, contributed, 0  # 由 backtest() 特殊處理 DCA


async def backtest(req: BacktestRequest, settings: Settings) -> BacktestResult:
    history = await _price_history(req.symbol, settings, req.years)
    is_tw = finmind_client.is_taiwan_symbol(req.symbol)
    market = "TW" if is_tw else "US"
    name = req.symbol.upper()
    if is_tw:
        info = await finmind_client.get_stock_info(req.symbol, settings.finmind_token)
        name = info.get("name", name)
    else:
        profile = await yfinance_client.get_profile_and_valuation(req.symbol)
        name = profile.get("name", name)

    if len(history) < 30:
        raise ValueError("歷史資料不足,無法回測(需至少約 30 個交易日)。")

    dates = [p["date"] for p in history]
    closes = np.array([p["close"] for p in history], dtype=float)
    span_years = max((len(closes) / TRADING_DAYS), 0.1)
    base = closes[0]
    benchmark = req.initialCapital * (closes / base)

    if req.strategy == "dca":
        shares = 0.0
        contributed = 0.0
        seen_month: set[str] = set()
        equity = np.zeros(len(closes))
        for i, (d, price) in enumerate(zip(dates, closes)):
            ym = d[:7]
            if ym not in seen_month:
                seen_month.add(ym)
                shares += req.monthlyAmount / price
                contributed += req.monthlyAmount
            equity[i] = shares * price
        initial = contributed
        # DCA 基準:把同樣的總投入在第一天一次買進
        benchmark = contributed * (closes / base)
        trades = len(seen_month)
        strat_equity = equity
    else:
        strat_equity, benchmark, initial, trades = _run_strategy(req, closes)

    metrics = _metrics_from_equity(dates, strat_equity, initial, span_years)
    metrics.tradeCount = trades
    bench_metrics = _metrics_from_equity(dates, benchmark, initial, span_years)

    # 權益曲線抽樣(避免回傳上千點)
    step = max(1, len(dates) // 240)
    equity_points = [
        EquityPoint(date=dates[i], strategy=round(float(strat_equity[i]), 0), benchmark=round(float(benchmark[i]), 0))
        for i in range(0, len(dates), step)
    ]
    if equity_points[-1].date != dates[-1]:
        equity_points.append(
            EquityPoint(date=dates[-1], strategy=round(float(strat_equity[-1]), 0), benchmark=round(float(benchmark[-1]), 0))
        )

    label = STRATEGY_LABELS[req.strategy]
    diff = metrics.totalReturnPercent - bench_metrics.totalReturnPercent
    vs = "優於" if diff > 0 else "落後" if diff < 0 else "持平"
    summary = (
        f"{name} 以「{label}」策略回測約 {span_years:.1f} 年,總報酬 {metrics.totalReturnPercent:.1f}%、"
        f"年化 {metrics.cagrPercent:.1f}%、最大回撤 {metrics.maxDrawdownPercent:.1f}%、夏普 {metrics.sharpe:.2f}。"
        f"相對買進持有基準{vs} {abs(diff):.1f} 個百分點。本回測未計交易成本與滑價,僅供教育參考,非投資建議。"
    )

    return BacktestResult(
        symbol=finmind_client.to_stock_id(req.symbol) if is_tw else req.symbol.upper(),
        name=name,
        market=market,
        strategy=req.strategy,
        strategyLabel=label,
        startDate=dates[0],
        endDate=dates[-1],
        initialCapital=round(initial, 0),
        finalValue=round(float(strat_equity[-1]), 0),
        metrics=metrics,
        benchmark=bench_metrics,
        equity=equity_points,
        summary=summary,
        source="finmind" if is_tw else "yfinance",
        updatedAt=_now(),
    )


# ---------------- 選股器 ----------------

async def _score_symbol(symbol: str, settings: Settings) -> ScreenerRow | None:
    try:
        fundamental = await fundamental_engine.analyze(symbol, settings)
        is_tw = fundamental.market == "TW"
        chip_score: int | None = None
        total = fundamental.fundamentalScore
        if is_tw:
            chip = await chip_engine.analyze(symbol, settings)
            if chip.available:
                chip_score = chip.chipScore
                total = round(fundamental.fundamentalScore * 0.6 + chip.chipScore * 0.4)
        return ScreenerRow(
            symbol=fundamental.symbol,
            name=fundamental.name,
            market=fundamental.market,
            totalScore=total,
            fundamentalScore=fundamental.fundamentalScore,
            chipScore=chip_score,
            per=fundamental.valuation.per,
            dividendYield=fundamental.valuation.dividendYield,
            revenueYoyPercent=fundamental.growth.revenueYoyPercent,
        )
    except Exception:
        return None


async def screen(req: ScreenerRequest, settings: Settings) -> ScreenerResult:
    if req.market == "TW":
        universe = TW_UNIVERSE
    elif req.market == "US":
        universe = US_UNIVERSE
    else:
        universe = TW_UNIVERSE + US_UNIVERSE

    # 限制併發,避免衝爆免費 API 額度。
    semaphore = asyncio.Semaphore(5)

    async def guarded(sym: str) -> ScreenerRow | None:
        async with semaphore:
            return await _score_symbol(sym, settings)

    results = await asyncio.gather(*[guarded(sym) for sym in universe])
    rows = [r for r in results if r is not None]

    # 套用條件
    filtered = [
        r
        for r in rows
        if r.fundamentalScore >= req.minFundamental
        and (r.chipScore is None or r.chipScore >= req.minChip if req.minChip > 0 else True)
        and (req.maxPer is None or (r.per is not None and 0 < r.per <= req.maxPer))
        and (req.minDividendYield is None or (r.dividendYield is not None and r.dividendYield >= req.minDividendYield))
    ]

    def sort_key(row: ScreenerRow):
        if req.sortBy == "fundamental":
            return row.fundamentalScore
        if req.sortBy == "chip":
            return row.chipScore or 0
        if req.sortBy == "dividendYield":
            return row.dividendYield or 0
        return row.totalScore

    filtered.sort(key=sort_key, reverse=True)

    notes = []
    if len(rows) < len(universe):
        notes.append(f"{len(universe) - len(rows)} 檔因資料或額度限制未納入。")

    return ScreenerResult(
        rows=filtered,
        count=len(filtered),
        universeSize=len(universe),
        market=req.market,
        updatedAt=_now(),
        notes=notes,
    )
