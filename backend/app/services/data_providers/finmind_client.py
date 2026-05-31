"""FinMind 台股資料封裝(免費真實資料)。

FinMind 開放 API v4:https://api.finmindtrade.com/api/v4/data
- 不帶 token 也可用,但額度較低;帶免費帳號 token 額度較高。
- 回傳格式:{"msg": ..., "status": 200, "data": [ {...}, ... ]}

本模組提供:
- get_stock_info:股票名稱、產業別
- get_valuation:最新 PER / PBR / 殖利率
- get_financial_statements:近年季度損益(營收、毛利、營業利益、稅後淨利、EPS)
- get_month_revenue:近月營收(用於成長動能)

所有結果走 TTL 快取以節省免費額度。
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import httpx

from app.services.data_providers import cache

BASE_URL = "https://api.finmindtrade.com/api/v4/data"

# FinMind 損益表 type 欄位 → 內部欄位對應。
_INCOME_TYPE_MAP = {
    "Revenue": "revenue",
    "GrossProfit": "grossProfit",
    "OperatingIncome": "operatingIncome",
    "PreTaxIncome": "preTaxIncome",
    "IncomeAfterTaxes": "netIncome",
    "EPS": "eps",
}


def is_taiwan_symbol(symbol: str) -> bool:
    """判斷是否為台股代號(純數字,或 .TW / .TWO 結尾)。"""
    upper = symbol.strip().upper()
    if upper.endswith(".TW") or upper.endswith(".TWO"):
        return True
    core = upper.split(".")[0]
    return core.isdigit() and 4 <= len(core) <= 6


def to_stock_id(symbol: str) -> str:
    """把 2330 / 2330.TW 正規化為 FinMind 用的純代號 2330。"""
    return symbol.strip().upper().split(".")[0]


async def _request(dataset: str, data_id: str, token: str | None, start_date: str | None = None) -> list[dict[str, Any]]:
    params: dict[str, str] = {"dataset": dataset, "data_id": data_id}
    if start_date:
        params["start_date"] = start_date
    if token:
        params["token"] = token

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(BASE_URL, params=params)
    response.raise_for_status()
    payload = response.json()
    if payload.get("status") != 200:
        raise RuntimeError(f"FinMind error for {dataset}/{data_id}: {payload.get('msg')}")
    return payload.get("data", []) or []


async def _cached_request(
    dataset: str,
    data_id: str,
    token: str | None,
    start_date: str | None = None,
    ttl: int = cache.DEFAULT_TTL,
) -> list[dict[str, Any]]:
    key = f"finmind:{dataset}:{data_id}:{start_date or ''}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    data = await _request(dataset, data_id, token, start_date)
    if data:
        cache.set(key, data, ttl)
    return data


async def get_stock_info(symbol: str, token: str | None) -> dict[str, str]:
    stock_id = to_stock_id(symbol)
    rows = await _cached_request("TaiwanStockInfo", stock_id, token, ttl=24 * 60 * 60)
    if not rows:
        return {"stockId": stock_id, "name": stock_id, "industry": ""}
    row = rows[-1]
    return {
        "stockId": stock_id,
        "name": row.get("stock_name") or stock_id,
        "industry": row.get("industry_category") or "",
    }


async def get_valuation(symbol: str, token: str | None) -> dict[str, float | None]:
    stock_id = to_stock_id(symbol)
    start = (date.today() - timedelta(days=30)).isoformat()
    rows = await _cached_request("TaiwanStockPER", stock_id, token, start_date=start, ttl=6 * 60 * 60)
    if not rows:
        return {"per": None, "pbr": None, "dividendYield": None, "asOf": None}
    latest = rows[-1]

    def _num(value: Any) -> float | None:
        try:
            num = float(value)
            return num if num != 0 else None
        except (TypeError, ValueError):
            return None

    return {
        "per": _num(latest.get("PER")),
        "pbr": _num(latest.get("PBR")),
        "dividendYield": _num(latest.get("dividend_yield")),
        "asOf": latest.get("date"),
    }


async def get_financial_statements(symbol: str, token: str | None) -> list[dict[str, Any]]:
    """回傳近年季度損益,新到舊排序(最多取最近 12 季)。"""
    stock_id = to_stock_id(symbol)
    start = (date.today() - timedelta(days=365 * 4)).isoformat()
    rows = await _cached_request(
        "TaiwanStockFinancialStatements", stock_id, token, start_date=start, ttl=12 * 60 * 60
    )

    # 長格式(date/type/value)→ 依季度 pivot。
    by_period: dict[str, dict[str, Any]] = {}
    for row in rows:
        field = _INCOME_TYPE_MAP.get(row.get("type"))
        if field is None:
            continue
        period = row.get("date")
        try:
            value = float(row.get("value"))
        except (TypeError, ValueError):
            continue
        by_period.setdefault(period, {"period": period})[field] = value

    periods = sorted(by_period.values(), key=lambda item: item["period"], reverse=True)
    return periods[:12]


# 三大法人 name 分類(FinMind 以英文標示各法人別)。
_FOREIGN_NAMES = {"Foreign_Investor", "Foreign_Dealer_Self"}
_TRUST_NAMES = {"Investment_Trust"}
_DEALER_NAMES = {"Dealer_self", "Dealer_Hedging"}


async def get_institutional_flow(symbol: str, token: str | None) -> list[dict[str, Any]]:
    """三大法人每日買賣超(股數),新到舊。回傳 {date, foreign, trust, dealer}。"""
    stock_id = to_stock_id(symbol)
    start = (date.today() - timedelta(days=120)).isoformat()
    rows = await _cached_request(
        "TaiwanStockInstitutionalInvestorsBuySell", stock_id, token, start_date=start, ttl=6 * 60 * 60
    )

    by_date: dict[str, dict[str, float]] = {}
    for row in rows:
        d = row.get("date")
        if not d:
            continue
        try:
            net = float(row.get("buy", 0)) - float(row.get("sell", 0))
        except (TypeError, ValueError):
            continue
        bucket = by_date.setdefault(d, {"date": d, "foreign": 0.0, "trust": 0.0, "dealer": 0.0})
        name = row.get("name")
        if name in _FOREIGN_NAMES:
            bucket["foreign"] += net
        elif name in _TRUST_NAMES:
            bucket["trust"] += net
        elif name in _DEALER_NAMES:
            bucket["dealer"] += net

    flows = sorted(by_date.values(), key=lambda item: item["date"], reverse=True)
    return flows[:60]


async def get_margin_short(symbol: str, token: str | None) -> list[dict[str, Any]]:
    """融資融券餘額(張),新到舊。回傳 {date, marginBalance, shortBalance}。"""
    stock_id = to_stock_id(symbol)
    start = (date.today() - timedelta(days=120)).isoformat()
    rows = await _cached_request(
        "TaiwanStockMarginPurchaseShortSale", stock_id, token, start_date=start, ttl=6 * 60 * 60
    )

    def _num(value: Any) -> float | None:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    points = [
        {
            "date": row.get("date"),
            "marginBalance": _num(row.get("MarginPurchaseTodayBalance")),
            "shortBalance": _num(row.get("ShortSaleTodayBalance")),
        }
        for row in rows
        if row.get("date")
    ]
    points.sort(key=lambda item: item["date"], reverse=True)
    return points[:60]


async def get_foreign_holding(symbol: str, token: str | None) -> list[dict[str, Any]]:
    """外資持股比率(%),新到舊。回傳 {date, ratio}。"""
    stock_id = to_stock_id(symbol)
    start = (date.today() - timedelta(days=180)).isoformat()
    rows = await _cached_request(
        "TaiwanStockShareholding", stock_id, token, start_date=start, ttl=12 * 60 * 60
    )

    points = []
    for row in rows:
        if not row.get("date"):
            continue
        try:
            ratio = float(row.get("ForeignInvestmentSharesRatio"))
        except (TypeError, ValueError):
            continue
        points.append({"date": row.get("date"), "ratio": ratio})
    points.sort(key=lambda item: item["date"], reverse=True)
    return points[:60]


async def get_price_history(symbol: str, token: str | None, years: int = 5) -> list[dict[str, Any]]:
    """日收盤序列(由舊到新)。回傳 {date, close}。"""
    stock_id = to_stock_id(symbol)
    start = (date.today() - timedelta(days=365 * years + 10)).isoformat()
    rows = await _cached_request("TaiwanStockPrice", stock_id, token, start_date=start, ttl=6 * 60 * 60)
    points: list[dict[str, Any]] = []
    for row in rows:
        try:
            close = float(row.get("close"))
        except (TypeError, ValueError):
            continue
        if close <= 0 or not row.get("date"):
            continue
        points.append({"date": row["date"], "close": close})
    points.sort(key=lambda item: item["date"])
    return points


async def get_month_revenue(symbol: str, token: str | None) -> list[dict[str, Any]]:
    """回傳近月營收,新到舊排序(最多取最近 18 個月)。"""
    stock_id = to_stock_id(symbol)
    start = (date.today() - timedelta(days=365 * 2)).isoformat()
    rows = await _cached_request(
        "TaiwanStockMonthRevenue", stock_id, token, start_date=start, ttl=12 * 60 * 60
    )
    points: list[dict[str, Any]] = []
    for row in rows:
        try:
            revenue = float(row.get("revenue"))
        except (TypeError, ValueError):
            continue
        year = row.get("revenue_year")
        month = row.get("revenue_month")
        label = f"{year}/{int(month):02d}" if year and month else row.get("date")
        points.append({"month": label, "revenue": revenue, "date": row.get("date")})
    points.sort(key=lambda item: item["date"] or "", reverse=True)
    return points[:18]
