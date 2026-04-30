"""市場快照：美股／台股 ETF 與指標標的。

Finnhub 台股格式為六位數 ETF 後綴 `.TW`（例如 0050.TW）。無 API key 或未覆蓋的代號會以 deterministic demo 回填。
"""

from __future__ import annotations

import hashlib
import random
from datetime import datetime, timedelta, timezone
from typing import Literal

import httpx

from app.config import Settings
from app.schemas import MarketQuote, MarketSnapshot, MarketTrendPoint

# 請求過長的清單擷取上限（可依部署調整）。
MAX_SNAPSHOT_SYMBOLS = 50

DEFAULT_WATCHLIST_SYMBOLS = [
    # --- 台股 ETF（Finnhub：0050.TW 格式）---
    "0050.TW",
    "0056.TW",
    "006208.TW",
    "00692.TW",
    "00733.TW",
    "00878.TW",
    "00929.TW",
    # --- 台股大型科技股 ---
    "2330.TW",
    "2317.TW",
    "2454.TW",
    "2308.TW",
    "2382.TW",
    "2303.TW",
    "3711.TW",
    "2412.TW",
    # --- 美國大型科技股 ---
    "AAPL",
    "MSFT",
    "NVDA",
    "TSLA",
    "GOOGL",
    "AMZN",
    "META",
    "AVGO",
    # --- 美股大盤／風格 ---
    "SPY",
    "QQQ",
    "VOO",
    "IVV",
    "VTI",
    "IWM",
    "VO",
    "SPLG",
    # --- 收益／股息型 ---
    "SCHD",
    "VYM",
    "DGRO",
    "JEPI",
    "QUAL",
    # --- 債券與固定收益 ---
    "TLT",
    "IEF",
    "AGG",
    "BND",
    "VCIT",
    "LQD",
    "HYG",
    # --- 地區 ---
    "VEA",
    "VXUS",
    "EWJ",
    "EWG",
    "VNQ",
    # --- 產業／主題 ---
    "XLK",
    "XLF",
    "SOXX",
    "SMH",
    "ARKK",
    "XLE",
    "MTUM",
    "GLD",
]

SYMBOL_NAMES: dict[str, str] = {
    # 美股 ETF / 標的（節選常見英文名稱以利介面）
    "SPY": "SPDR S&P 500 ETF Trust",
    "QQQ": "Invesco Nasdaq 100 ETF",
    "VOO": "Vanguard S&P 500 ETF",
    "IVV": "iShares Core S&P 500 ETF",
    "VTI": "Vanguard Total Stock Market ETF",
    "IWM": "iShares Russell 2000 ETF",
    "VO": "Vanguard Mid-Cap ETF",
    "SPLG": "SPDR Portfolio S&P 500 ETF",
    "SCHD": "Schwab U.S. Dividend Equity ETF",
    "VYM": "Vanguard High Dividend Yield ETF",
    "DGRO": "iShares Core Dividend Growth ETF",
    "JEPI": "JPMorgan Equity Premium Income ETF",
    "QUAL": "iShares MSCI USA Quality Factor ETF",
    "TLT": "iShares 20+ Year Treasury Bond ETF",
    "IEF": "iShares 7–10 Year Treasury ETF",
    "AGG": "iShares Core U.S. Aggregate Bond ETF",
    "BND": "Vanguard Total Bond Market ETF",
    "VCIT": "Vanguard Intermediate-Term Corporate Bond ETF",
    "LQD": "iShares iBoxx Investment Grade Corporate Bond ETF",
    "HYG": "iShares iBoxx High Yield Corporate Bond ETF",
    "VEA": "Vanguard FTSE Developed Markets ETF",
    "VXUS": "Vanguard Total International Stock ETF",
    "EWJ": "iShares MSCI Japan ETF",
    "EWG": "iShares MSCI Germany ETF",
    "VNQ": "Vanguard Real Estate ETF",
    "XLK": "Technology Select Sector SPDR Fund",
    "XLF": "Financial Select Sector SPDR Fund",
    "SOXX": "iShares Semiconductor ETF",
    "SMH": "VanEck Semiconductor ETF",
    "ARKK": "ARK Innovation ETF",
    "XLE": "Energy Select Sector SPDR Fund",
    "MTUM": "iShares MSCI USA Momentum Factor ETF",
    "GLD": "SPDR Gold Shares",
    # 過往 demo／個股相容
    "AAPL": "Apple Inc.",
    "MSFT": "Microsoft Corporation",
    "NVDA": "NVIDIA Corporation",
    "TSLA": "Tesla Inc.",
    "GOOGL": "Alphabet Inc.",
    "AMZN": "Amazon.com Inc.",
    "META": "Meta Platforms Inc.",
    "AVGO": "Broadcom Inc.",
    # 台股 ETF（中文名）
    "0050.TW": "元大台灣卓越50 ETF",
    "0056.TW": "元大台灣高股息 ETF",
    "006208.TW": "富邦台灣50 ETF",
    "00692.TW": "富邦公司治理 ETF",
    "00733.TW": "富邦臺灣中小 ETF",
    "00878.TW": "國泰台灣5G+ ETF",
    "00929.TW": "復華台灣科技優息 ETF",
    # 台股大型科技股
    "2330.TW": "台積電",
    "2317.TW": "鴻海",
    "2454.TW": "聯發科",
    "2308.TW": "台達電",
    "2382.TW": "廣達",
    "2303.TW": "聯電",
    "3711.TW": "日月光投控",
    "2412.TW": "中華電",
}

LEGACY_DEMO_QUOTES = {
    "0050.TW": (188.4, 3.9, 2.11, 184.8, 189.2, 183.1, 184.5, 12840000, 0.018),
    "0056.TW": (38.55, 0.42, 1.10, 38.05, 38.7, 37.9, 38.13, 21450000, 0.045),
    "006208.TW": (112.7, 2.1, 1.90, 110.4, 113.0, 109.8, 110.6, 4820000, 0.019),
    "00692.TW": (46.35, 0.28, 0.61, 46.0, 46.6, 45.75, 46.07, 1830000, 0.026),
    "00733.TW": (64.8, -0.85, -1.29, 65.4, 65.8, 64.1, 65.65, 920000, 0.012),
    "00878.TW": (22.45, 0.18, 0.81, 22.25, 22.52, 22.12, 22.27, 48700000, 0.052),
    "00929.TW": (20.28, -0.12, -0.59, 20.38, 20.45, 20.12, 20.4, 36200000, 0.061),
    "2330.TW": (928.0, 18.0, 1.98, 910.0, 935.0, 905.0, 910.0, 42350000, 0.012),
    "2317.TW": (184.5, 2.5, 1.37, 182.0, 186.0, 180.5, 182.0, 38400000, 0.028),
    "2454.TW": (1195.0, -15.0, -1.24, 1210.0, 1225.0, 1185.0, 1210.0, 5120000, 0.067),
    "2308.TW": (396.5, 8.0, 2.06, 389.0, 399.0, 386.0, 388.5, 11800000, 0.026),
    "2382.TW": (298.0, 4.5, 1.53, 294.0, 301.0, 291.0, 293.5, 24600000, 0.03),
    "2303.TW": (52.4, -0.6, -1.13, 53.0, 53.4, 52.1, 53.0, 33600000, 0.057),
    "3711.TW": (158.0, 1.5, 0.96, 156.5, 159.5, 155.0, 156.5, 8400000, 0.045),
    "2412.TW": (124.0, 0.5, 0.4, 123.5, 124.5, 123.0, 123.5, 7600000, 0.039),
    "SPY": (512.4, 2.84, 0.56, 509.1, 513.2, 507.6, 509.56, 73124000, 0.013),
    "QQQ": (438.9, 4.72, 1.09, 434.1, 440.3, 432.8, 434.18, 51488000, 0.006),
    "VOO": (470.8, 2.51, 0.54, 468.3, 471.6, 466.9, 468.29, 6221000, 0.014),
    "SCHD": (78.6, -0.21, -0.27, 78.8, 79.0, 78.1, 78.81, 3675000, 0.035),
    "TLT": (91.2, -0.74, -0.8, 91.9, 92.1, 90.7, 91.94, 42890000, 0.038),
    "AAPL": (191.7, 1.23, 0.65, 190.0, 192.4, 189.2, 190.47, 48930000, 0.005),
    "MSFT": (425.1, 3.12, 0.74, 421.7, 426.0, 420.8, 421.98, 22460000, 0.008),
    "NVDA": (881.4, 19.8, 2.3, 862.0, 887.5, 858.2, 861.6, 55820000, 0.000),
    "TSLA": (178.2, -4.38, -2.4, 182.1, 183.0, 176.4, 182.58, 93420000, 0.000),
    "GOOGL": (174.2, 2.35, 1.37, 171.8, 175.1, 170.9, 171.85, 28500000, 0.004),
    "AMZN": (186.7, 1.9, 1.03, 184.5, 187.8, 183.9, 184.8, 41200000, 0.000),
    "META": (512.3, -6.1, -1.18, 518.4, 522.0, 509.5, 518.4, 16800000, 0.004),
    "AVGO": (1395.0, 22.0, 1.6, 1378.0, 1412.0, 1364.0, 1373.0, 3900000, 0.014),
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _trade_currency(symbol: str) -> Literal["USD", "TWD"]:
    return "TWD" if symbol.upper().endswith(".TW") else "USD"


def _display_name(symbol: str) -> str:
    upper = symbol.upper()
    return SYMBOL_NAMES.get(upper, upper.replace(".TW", " 台股"))


def _seed_for(symbol: str, salt: str) -> int:
    digest = hashlib.blake2b((symbol.upper() + salt).encode(), digest_size=16).digest()
    return int.from_bytes(digest[:8], "big")


def _synthetic_demo_tuple(symbol: str) -> tuple[float, float, float, float, float, float, float, int, float]:
    rnd = random.Random(_seed_for(symbol, "demo-quote-v2"))
    tw = symbol.upper().endswith(".TW")
    prev_close = round(rnd.uniform(40, 280) + (rnd.uniform(-6, 6) if tw else rnd.uniform(5, 320)), 2)
    change_percent = round(rnd.uniform(-2.95, 3.08), 2)
    price = round(prev_close * (1 + change_percent / 100), 2)
    change = round(price - prev_close, 2)
    open_px = round((prev_close + price) / 2 + rnd.uniform(-prev_close * 0.008, prev_close * 0.008), 2)

    corridor = max(abs(prev_close * 0.005), abs(price - prev_close) * 0.7 + rnd.uniform(0.02, 0.45))
    raw_low = min(open_px, price, prev_close) - rnd.uniform(0.01, corridor)
    raw_high = max(open_px, price, prev_close) + rnd.uniform(0.01, corridor)
    low = round(max(raw_low, min(open_px, price, prev_close) - corridor * 1.75), 2)
    high = round(min(raw_high, max(open_px, price, prev_close) + corridor * 1.75), 2)

    volume = rnd.randint(80_000, 98_000_000)
    div_yield = round(rnd.uniform(0.001, min(0.085, prev_close / 9800)), 4)

    return price, change, change_percent, open_px, high, low, prev_close, volume, div_yield


def _demo_tuple(symbol: str) -> tuple[float, float, float, float, float, float, float, int, float]:
    upper = symbol.strip().upper()
    if upper in LEGACY_DEMO_QUOTES:
        return LEGACY_DEMO_QUOTES[upper]
    return _synthetic_demo_tuple(upper)


def _signal(change_percent: float, price: float, low: float, high: float) -> tuple[str, str]:
    range_position = 0.5 if high <= low else (price - low) / (high - low)
    if change_percent >= 1.0 and range_position >= 0.65:
        return "bullish", "動能偏正向，價格位於今日區間上緣，短線買盤較有優勢。"
    if change_percent <= -1.0 or range_position <= 0.25:
        return "caution", "價格表現偏弱，接近日內區間低位，應檢查部位大小與下行風險。"
    return "neutral", "市場訊號混合，建議等待更明確的趨勢確認後再調整配置。"


def _trend_points(symbol: str, price: float, previous_close: float, change_percent: float) -> list[MarketTrendPoint]:
    rnd = random.Random(_seed_for(symbol, "recent-trend-v1"))
    points = 30
    drift = change_percent / 100 / max(points - 1, 1)
    volatility = 0.006 + min(abs(change_percent) / 100, 0.04) * 0.22

    values = [max(0.01, previous_close)]
    for _ in range(points - 2):
        next_price = values[-1] * (1 + drift + rnd.uniform(-volatility, volatility))
        values.append(max(0.01, next_price))
    values.append(max(0.01, price))

    base = values[0] or 1
    today = datetime.now(timezone.utc).date()
    return [
        MarketTrendPoint(
            label=(today - timedelta(days=points - index - 1)).strftime("%m/%d") if index < points - 1 else "Now",
            price=round(value, 2),
            changePercent=round(((value - base) / base) * 100, 2),
            dayChangePercent=0.0 if index == 0 else round(((value - values[index - 1]) / values[index - 1]) * 100, 2),
        )
        for index, value in enumerate(values)
    ]


def _quote_from_demo(symbol: str) -> MarketQuote:
    price, change, change_percent, open_, high, low, previous_close, volume, dividend_yield = _demo_tuple(
        symbol
    )
    signal, analysis = _signal(change_percent, price, low, high)
    upper = symbol.strip().upper()
    return MarketQuote(
        symbol=upper,
        name=_display_name(upper),
        tradeCurrency=_trade_currency(upper),
        price=price,
        change=change,
        changePercent=change_percent,
        open=open_,
        high=high,
        low=low,
        previousClose=previous_close,
        volume=volume,
        marketCap=None,
        peRatio=None,
        dividendYield=dividend_yield,
        source="demo",
        updatedAt=_now(),
        signal=signal,
        analysis=analysis,
        trend=_trend_points(upper, price, previous_close, change_percent),
    )


async def _quote_from_finnhub(symbol: str, api_key: str) -> MarketQuote:
    upper = symbol.strip().upper()
    async with httpx.AsyncClient(timeout=12) as client:
        quote_response = await client.get(
            "https://finnhub.io/api/v1/quote",
            params={"symbol": upper, "token": api_key},
        )
        metric_response = await client.get(
            "https://finnhub.io/api/v1/stock/metric",
            params={"symbol": upper, "metric": "all", "token": api_key},
        )
    quote_response.raise_for_status()
    payload = quote_response.json()
    metrics = metric_response.json().get("metric", {}) if metric_response.status_code == 200 else {}

    price = float(payload.get("c") or 0)
    previous_close = float(payload.get("pc") or price)
    change = price - previous_close
    change_percent = 0.0 if previous_close == 0 else change / previous_close * 100
    high = float(payload.get("h") or price)
    low = float(payload.get("l") or price)
    signal, analysis = _signal(change_percent, price, low, high)

    name = SYMBOL_NAMES.get(upper)
    pe_raw = metrics.get("peBasicExclExtraTTM")
    dividend_raw = metrics.get("dividendYieldIndicatedAnnual")

    div_yield_final: float | None
    try:
        div_yield_final = None if dividend_raw is None else float(dividend_raw)
    except (TypeError, ValueError):
        div_yield_final = None

    return MarketQuote(
        symbol=upper,
        name=name or upper,
        tradeCurrency=_trade_currency(upper),
        price=price,
        change=change,
        changePercent=change_percent,
        open=float(payload.get("o") or price),
        high=high,
        low=low,
        previousClose=previous_close,
        volume=int(metrics.get("10DayAverageTradingVolume") or 0),
        marketCap=(float(metrics["marketCapitalization"]) if metrics.get("marketCapitalization") else None),
        peRatio=(float(pe_raw) if pe_raw else None),
        dividendYield=div_yield_final,
        source="finnhub",
        updatedAt=_now(),
        signal=signal,
        analysis=analysis,
        trend=_trend_points(upper, price, previous_close, change_percent),
    )


async def get_market_snapshot(symbols: list[str], settings: Settings) -> MarketSnapshot:
    normalized = [symbol.strip().upper() for symbol in symbols if symbol.strip()]
    if not normalized:
        normalized = list(DEFAULT_WATCHLIST_SYMBOLS)

    normalized = normalized[:MAX_SNAPSHOT_SYMBOLS]

    quotes: list[MarketQuote] = []
    source = "demo"
    fallback_used = False

    if settings.finnhub_api_key:
        for symbol in normalized:
            try:
                quotes.append(await _quote_from_finnhub(symbol, settings.finnhub_api_key))
                source = "finnhub"
            except Exception:
                fallback_used = True
                quotes.append(_quote_from_demo(symbol))
        if fallback_used:
            source = "finnhub+demo"

    else:
        for symbol in normalized:
            quotes.append(_quote_from_demo(symbol))

    average_change = sum(quote.changePercent for quote in quotes) / len(quotes)
    risk_count = sum(1 for quote in quotes if quote.signal == "caution")

    if average_change > 0.6 and risk_count == 0:
        summary = (
            "整體市場（含 ETF 清單）氣氛偏建設性，動能有利於與標的對齊的曝險，但仍需留意部位與流動性。"
        )
    elif risk_count >= max(2, len(quotes) // 3):
        summary = (
            "自選清單中風險訊號升高，尤其是短線疲弱標的偏多，可評估縮短久期、股息防禦與較保守提領率。"
        )
    else:
        summary = "標的間表現分歧，請搭配情境壓力測試與分散在不同市場／資產類別。"

    return MarketSnapshot(quotes=quotes, source=source, updatedAt=_now(), summary=summary)
