"""yfinance 美股資料封裝(免費真實資料)。

yfinance 為同步阻塞式 API,透過 asyncio.to_thread 在執行緒池中呼叫,
避免卡住 FastAPI event loop。結果走 TTL 快取。

提供:
- get_profile:名稱、交易幣別
- get_valuation:PER / PBR / 殖利率 / 市值 / ROE
- get_financial_statements:近季損益(營收、毛利、營業利益、稅後淨利、稀釋 EPS)
"""

from __future__ import annotations

import asyncio
from typing import Any

from app.services.data_providers import cache

# yfinance 季度損益表 row 名稱 → 內部欄位。
_INCOME_ROW_MAP = {
    "Total Revenue": "revenue",
    "Gross Profit": "grossProfit",
    "Operating Income": "operatingIncome",
    "Net Income": "netIncome",
    "Diluted EPS": "eps",
}


def _safe_float(value: Any) -> float | None:
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if num != num:  # NaN 檢查
        return None
    return num


def _load_ticker(symbol: str):
    import yfinance as yf

    return yf.Ticker(symbol)


def _fetch_profile_and_valuation(symbol: str) -> dict[str, Any]:
    ticker = _load_ticker(symbol)
    info = {}
    try:
        info = ticker.get_info()
    except Exception:
        info = {}

    # 新版 yfinance 的 dividendYield 已是百分比數值(0.81 = 0.81%),直接採用。
    div_yield = _safe_float(info.get("dividendYield"))

    roe = _safe_float(info.get("returnOnEquity"))
    if roe is not None and abs(roe) < 5:
        roe = roe * 100

    return {
        "name": info.get("longName") or info.get("shortName") or symbol.upper(),
        "currency": info.get("currency") or "USD",
        "per": _safe_float(info.get("trailingPE")),
        "pbr": _safe_float(info.get("priceToBook")),
        "dividendYield": div_yield,
        "marketCap": _safe_float(info.get("marketCap")),
        "roe": roe,
        "industry": info.get("industry") or info.get("sector") or "",
    }


def _fetch_financials(symbol: str) -> list[dict[str, Any]]:
    ticker = _load_ticker(symbol)
    try:
        frame = ticker.quarterly_income_stmt
    except Exception:
        return []
    if frame is None or frame.empty:
        return []

    periods: list[dict[str, Any]] = []
    for column in frame.columns:
        period_label = str(getattr(column, "date", lambda: column)()) if hasattr(column, "date") else str(column)
        point: dict[str, Any] = {"period": period_label[:10]}
        for row_name, field in _INCOME_ROW_MAP.items():
            if row_name in frame.index:
                point[field] = _safe_float(frame.loc[row_name, column])
        periods.append(point)

    periods.sort(key=lambda item: item["period"], reverse=True)
    return periods[:12]


async def get_profile_and_valuation(symbol: str) -> dict[str, Any]:
    key = f"yf:info:{symbol.upper()}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    data = await asyncio.to_thread(_fetch_profile_and_valuation, symbol)
    if data:
        cache.set(key, data, ttl=6 * 60 * 60)
    return data


def _fetch_price_history(symbol: str, period: str) -> list[dict[str, Any]]:
    ticker = _load_ticker(symbol)
    try:
        frame = ticker.history(period=period, auto_adjust=True)
    except Exception:
        return []
    if frame is None or frame.empty or "Close" not in frame.columns:
        return []
    points: list[dict[str, Any]] = []
    for index, value in frame["Close"].items():
        close = _safe_float(value)
        if close is None or close <= 0:
            continue
        points.append({"date": str(index)[:10], "close": close})
    return points


async def get_price_history(symbol: str, period: str = "5y") -> list[dict[str, Any]]:
    key = f"yf:hist:{symbol.upper()}:{period}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    data = await asyncio.to_thread(_fetch_price_history, symbol, period)
    if data:
        cache.set(key, data, ttl=6 * 60 * 60)
    return data


async def get_financial_statements(symbol: str) -> list[dict[str, Any]]:
    key = f"yf:fin:{symbol.upper()}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    data = await asyncio.to_thread(_fetch_financials, symbol)
    if data:
        cache.set(key, data, ttl=12 * 60 * 60)
    return data
