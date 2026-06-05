"""基本面分析引擎。

整合資料層(FinMind 台股 / yfinance 美股),計算:
- 各季度利潤率(毛利率、營益率、淨利率)
- 成長性(營收 YoY/MoM、EPS YoY、TTM EPS)
- 基本面評分(獲利能力、成長性、估值、股息四項加權)
- 文字摘要

本檔僅做分析,不提供投資建議。
"""

from __future__ import annotations

import math
import statistics
from datetime import datetime, timezone

from app.config import Settings
from app.schemas import (
    FinancialPeriod,
    FundamentalAnalysis,
    GrowthMetrics,
    RevenuePoint,
    ScoreItem,
    ValuationMetrics,
)
from app.services import market_data
from app.services.data_providers import finmind_client, yfinance_client


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _pct(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator is None or denominator == 0:
        return None
    return round(numerator / denominator * 100, 2)


def _change_pct(current: float | None, previous: float | None) -> float | None:
    if current is None or previous is None or previous == 0:
        return None
    return round((current - previous) / abs(previous) * 100, 2)


def _with_margins(periods: list[dict]) -> list[FinancialPeriod]:
    result: list[FinancialPeriod] = []
    for item in periods:
        revenue = item.get("revenue")
        result.append(
            FinancialPeriod(
                period=item.get("period", ""),
                revenue=revenue,
                grossProfit=item.get("grossProfit"),
                operatingIncome=item.get("operatingIncome"),
                netIncome=item.get("netIncome"),
                eps=item.get("eps"),
                grossMargin=_pct(item.get("grossProfit"), revenue),
                operatingMargin=_pct(item.get("operatingIncome"), revenue),
                netMargin=_pct(item.get("netIncome"), revenue),
            )
        )
    return result


def _ttm_eps(statements: list[FinancialPeriod]) -> float | None:
    eps_values = [p.eps for p in statements if p.eps is not None]
    if len(eps_values) < 4:
        return None
    return round(sum(eps_values[:4]), 2)


def _eps_yoy(statements: list[FinancialPeriod]) -> float | None:
    eps_values = [p.eps for p in statements if p.eps is not None]
    if len(eps_values) < 8:
        return None
    current_ttm = sum(eps_values[:4])
    prior_ttm = sum(eps_values[4:8])
    return _change_pct(current_ttm, prior_ttm)


# ---- 評分:每項回傳 (0-100 分, 說明文字) ----

def _score_profitability(statements: list[FinancialPeriod], roe: float | None) -> tuple[int, str]:
    latest_margin = next((p.netMargin for p in statements if p.netMargin is not None), None)
    if latest_margin is None and roe is None:
        return 50, "缺少利潤率與 ROE 資料,以中性計分。"
    score = 50
    basis = []
    if latest_margin is not None:
        if latest_margin >= 20:
            score = 90
        elif latest_margin >= 10:
            score = 75
        elif latest_margin >= 5:
            score = 62
        elif latest_margin > 0:
            score = 48
        else:
            score = 25
        basis.append(f"最新淨利率 {latest_margin:.1f}%")
    if roe is not None:
        roe_score = 90 if roe >= 20 else 75 if roe >= 12 else 60 if roe >= 6 else 40
        score = round((score + roe_score) / 2) if latest_margin is not None else roe_score
        basis.append(f"ROE {roe:.1f}%")
    return score, "、".join(basis) or "獲利能力中性。"


def _score_growth(growth: GrowthMetrics) -> tuple[int, str]:
    yoy = growth.revenueYoyPercent
    if yoy is None and growth.epsYoyPercent is None:
        return 50, "缺少成長資料,以中性計分。"
    ref = yoy if yoy is not None else growth.epsYoyPercent
    if ref >= 20:
        score = 90
    elif ref >= 10:
        score = 76
    elif ref >= 0:
        score = 60
    elif ref >= -10:
        score = 42
    else:
        score = 25
    label = "營收" if yoy is not None else "EPS"
    return score, f"{label} 年增 {ref:.1f}%"


def _score_valuation(valuation: ValuationMetrics) -> tuple[int, str]:
    per = valuation.per
    if per is None:
        return 50, "無本益比資料,以中性計分。"
    if per <= 0:
        return 30, f"本益比為負或無意義({per:.1f}),獲利可能虧損。"
    if per <= 12:
        score = 85
    elif per <= 18:
        score = 72
    elif per <= 25:
        score = 58
    elif per <= 35:
        score = 45
    else:
        score = 32
    return score, f"本益比 {per:.1f} 倍"


def _score_dividend(valuation: ValuationMetrics) -> tuple[int, str]:
    dy = valuation.dividendYield
    if dy is None or dy == 0:
        return 42, "無股息或缺資料。"
    if dy >= 5:
        score = 88
    elif dy >= 3:
        score = 75
    elif dy >= 1.5:
        score = 62
    else:
        score = 50
    return score, f"殖利率 {dy:.2f}%"


def _build_score(
    statements: list[FinancialPeriod],
    growth: GrowthMetrics,
    valuation: ValuationMetrics,
) -> tuple[int, list[ScoreItem]]:
    specs = [
        ("獲利能力", 0.30, _score_profitability(statements, valuation.roe)),
        ("成長性", 0.30, _score_growth(growth)),
        ("估值", 0.20, _score_valuation(valuation)),
        ("股息", 0.20, _score_dividend(valuation)),
    ]
    breakdown = [
        ScoreItem(label=label, score=result[0], weight=weight, detail=result[1])
        for label, weight, result in specs
    ]
    overall = round(sum(item.score * item.weight for item in breakdown))
    return overall, breakdown


def _score_return(value: float | None, label: str) -> tuple[int, str]:
    if value is None:
        return 50, f"缺少{label}資料,以中性計分。"
    if value >= 20:
        score = 88
    elif value >= 10:
        score = 76
    elif value >= 0:
        score = 62
    elif value >= -10:
        score = 42
    else:
        score = 28
    return score, f"{label} {value:.1f}%"


def _score_volatility(value: float | None) -> tuple[int, str]:
    if value is None:
        return 55, "缺少波動資料,以中性計分。"
    if value <= 12:
        score = 78
    elif value <= 20:
        score = 66
    elif value <= 30:
        score = 52
    else:
        score = 38
    return score, f"年化波動約 {value:.1f}%"


def _build_etf_score(growth: GrowthMetrics, valuation: ValuationMetrics) -> tuple[int, list[ScoreItem]]:
    specs = [
        ("配息能力", 0.25, _score_dividend(valuation)),
        ("長期表現", 0.35, _score_return(growth.revenueYoyPercent, "近一年報酬")),
        ("近期動能", 0.20, _score_return(growth.revenueMomPercent, "近一月報酬")),
        ("波動風險", 0.20, _score_volatility(valuation.volatilityPercent)),
    ]
    breakdown = [
        ScoreItem(label=label, score=result[0], weight=weight, detail=result[1])
        for label, weight, result in specs
    ]
    overall = round(sum(item.score * item.weight for item in breakdown))
    return overall, breakdown


def _latest_return(history: list[dict], days: int) -> float | None:
    if len(history) <= days:
        return None
    current = history[-1].get("close")
    previous = history[-days - 1].get("close")
    return _change_pct(current, previous)


def _annualized_volatility(history: list[dict]) -> float | None:
    closes = [point.get("close") for point in history[-253:] if point.get("close")]
    if len(closes) < 30:
        return None
    returns = [(closes[index] - closes[index - 1]) / closes[index - 1] for index in range(1, len(closes))]
    if len(returns) < 2:
        return None
    return round(statistics.stdev(returns) * math.sqrt(252) * 100, 2)


def _split_adjusted_history(history: list[dict]) -> list[dict]:
    adjusted: list[dict] = []
    factor = 1.0
    for index, point in enumerate(reversed(history)):
        close = point.get("close")
        if close is None:
            continue
        adjusted.append({"date": point.get("date"), "close": round(close * factor, 4)})
        next_older = history[len(history) - index - 2] if len(history) - index - 2 >= 0 else None
        if next_older and next_older.get("close"):
            older_close = next_older["close"]
            change = (close - older_close) / older_close
            if abs(change) > 0.3:
                factor *= close / older_close
    adjusted.reverse()
    return adjusted


def _is_etf(info: dict[str, str]) -> bool:
    return (info.get("industry") or "").strip().upper() == "ETF"


def _etf_summary(name: str, score: int, breakdown: list[ScoreItem]) -> str:
    if score >= 75:
        tone = "ETF 表現穩健"
    elif score >= 55:
        tone = "ETF 表現中性偏穩"
    elif score >= 40:
        tone = "ETF 表現平淡,需搭配風險控管"
    else:
        tone = "ETF 表現偏弱,需謹慎檢視配置"
    strongest = max(breakdown, key=lambda item: item.score)
    weakest = min(breakdown, key=lambda item: item.score)
    return (
        f"{name} 綜合 ETF 評分 {score} 分,{tone}。"
        f"相對強項為「{strongest.label}」({strongest.detail});"
        f"較弱的一環是「{weakest.label}」({weakest.detail})。"
        f"本分析使用價格、配息與波動資料,僅供教育參考,非投資建議。"
    )


def _summary(name: str, score: int, breakdown: list[ScoreItem]) -> str:
    if score >= 75:
        tone = "基本面整體穩健"
    elif score >= 55:
        tone = "基本面中等偏穩"
    elif score >= 40:
        tone = "基本面表現平淡,有隱憂"
    else:
        tone = "基本面偏弱,需謹慎"
    strongest = max(breakdown, key=lambda item: item.score)
    weakest = min(breakdown, key=lambda item: item.score)
    return (
        f"{name} 綜合基本面評分 {score} 分,{tone}。"
        f"相對強項為「{strongest.label}」({strongest.detail});"
        f"較弱的一環是「{weakest.label}」({weakest.detail})。"
        f"本分析僅供教育參考,非投資建議。"
    )


async def _build_taiwan(symbol: str, settings: Settings) -> FundamentalAnalysis:
    token = settings.finmind_token
    info = await finmind_client.get_stock_info(symbol, token)
    if _is_etf(info):
        return await _build_taiwan_etf(symbol, settings, info)

    valuation_raw = await finmind_client.get_valuation(symbol, token)
    statements_raw = await finmind_client.get_financial_statements(symbol, token)
    revenue_raw = await finmind_client.get_month_revenue(symbol, token)

    statements = _with_margins(statements_raw)

    # 月營收趨勢 + YoY(新到舊;同月去年在 12 個月前)。
    revenue_trend: list[RevenuePoint] = []
    for index, point in enumerate(revenue_raw):
        prior = revenue_raw[index + 12]["revenue"] if index + 12 < len(revenue_raw) else None
        revenue_trend.append(
            RevenuePoint(
                month=point["month"],
                revenue=point["revenue"],
                yoyPercent=_change_pct(point["revenue"], prior),
            )
        )

    revenue_yoy = revenue_trend[0].yoyPercent if revenue_trend else None
    revenue_mom = (
        _change_pct(revenue_raw[0]["revenue"], revenue_raw[1]["revenue"])
        if len(revenue_raw) >= 2
        else None
    )

    valuation = ValuationMetrics(
        per=valuation_raw.get("per"),
        pbr=valuation_raw.get("pbr"),
        dividendYield=valuation_raw.get("dividendYield"),
        marketCap=None,
        roe=None,
        asOf=valuation_raw.get("asOf"),
    )
    growth = GrowthMetrics(
        revenueYoyPercent=revenue_yoy,
        revenueMomPercent=revenue_mom,
        epsYoyPercent=_eps_yoy(statements),
        ttmEps=_ttm_eps(statements),
    )

    data_available = bool(statements or revenue_trend or valuation.per)
    score, breakdown = _build_score(statements, growth, valuation)
    notes = [] if data_available else ["FinMind 未回傳此代號的資料,可能為非上市或免費額度受限。"]

    return FundamentalAnalysis(
        symbol=finmind_client.to_stock_id(symbol),
        name=info["name"],
        market="TW",
        currency="TWD",
        industry=info.get("industry") or None,
        valuation=valuation,
        growth=growth,
        statements=statements,
        revenueTrend=revenue_trend[:18],
        fundamentalScore=score,
        scoreBreakdown=breakdown,
        summary=_summary(info["name"], score, breakdown),
        source="finmind",
        updatedAt=_now(),
        dataAvailable=data_available,
        notes=notes,
    )


async def _build_taiwan_etf(symbol: str, settings: Settings, info: dict[str, str]) -> FundamentalAnalysis:
    token = settings.finmind_token
    stock_id = finmind_client.to_stock_id(symbol)
    market_symbol = f"{stock_id}.TW"
    history = await finmind_client.get_price_history(stock_id, token, years=2)
    adjusted_history = _split_adjusted_history(history)
    snapshot = await market_data.get_market_snapshot([market_symbol], settings)
    quote = snapshot.quotes[0] if snapshot.quotes else None

    latest_close = history[-1]["close"] if history else (quote.price if quote else None)
    one_year_return = _latest_return(adjusted_history, 252)
    one_month_return = _latest_return(adjusted_history, 20)
    twenty_day_return = _latest_return(adjusted_history, 20)
    volatility = _annualized_volatility(adjusted_history)
    dividend_yield = quote.dividendYield * 100 if quote and quote.dividendYield is not None else None

    trend_source = history[-60:]
    trend = [
        RevenuePoint(
            month=point["date"],
            revenue=point["close"],
            yoyPercent=_change_pct(point["close"], trend_source[index - 1]["close"]) if index > 0 else None,
        )
        for index, point in enumerate(trend_source)
    ]

    valuation = ValuationMetrics(
        per=None,
        pbr=None,
        dividendYield=dividend_yield,
        marketCap=None,
        roe=None,
        latestPrice=latest_close,
        priceChangePercent=quote.changePercent if quote else twenty_day_return,
        volatilityPercent=volatility,
        asOf=history[-1]["date"] if history else None,
    )
    growth = GrowthMetrics(
        revenueYoyPercent=one_year_return,
        revenueMomPercent=one_month_return,
        epsYoyPercent=twenty_day_return,
        ttmEps=latest_close,
    )

    data_available = bool(history or quote)
    score, breakdown = _build_etf_score(growth, valuation)
    notes = [] if data_available else ["目前無法取得 ETF 價格或配息資料,請稍後再試。"]

    return FundamentalAnalysis(
        symbol=stock_id,
        name=info["name"],
        market="TW",
        currency="TWD",
        industry="ETF",
        valuation=valuation,
        growth=growth,
        statements=[],
        revenueTrend=trend,
        fundamentalScore=score,
        scoreBreakdown=breakdown,
        summary=_etf_summary(info["name"], score, breakdown),
        source="finmind+market",
        updatedAt=_now(),
        dataAvailable=data_available,
        notes=notes,
    )


async def _build_us(symbol: str) -> FundamentalAnalysis:
    upper = symbol.strip().upper()
    profile = await yfinance_client.get_profile_and_valuation(upper)
    statements_raw = await yfinance_client.get_financial_statements(upper)
    statements = _with_margins(statements_raw)

    # 用季度營收估 YoY(最新季 vs 去年同季,即 4 季前)。
    revenue_yoy = None
    if len(statements) >= 5:
        revenue_yoy = _change_pct(statements[0].revenue, statements[4].revenue)
    revenue_mom = None  # 美股以季為主,不提供月增。

    valuation = ValuationMetrics(
        per=profile.get("per"),
        pbr=profile.get("pbr"),
        dividendYield=profile.get("dividendYield"),
        marketCap=profile.get("marketCap"),
        roe=profile.get("roe"),
        latestPrice=None,
        priceChangePercent=None,
        volatilityPercent=None,
        asOf=None,
    )
    growth = GrowthMetrics(
        revenueYoyPercent=revenue_yoy,
        revenueMomPercent=revenue_mom,
        epsYoyPercent=_eps_yoy(statements),
        ttmEps=_ttm_eps(statements),
    )

    name = profile.get("name") or upper
    data_available = bool(statements or valuation.per)
    score, breakdown = _build_score(statements, growth, valuation)
    notes = [] if data_available else ["yfinance 未回傳此代號的財報,請確認代號是否正確。"]

    return FundamentalAnalysis(
        symbol=upper,
        name=name,
        market="US",
        currency="USD",
        industry=profile.get("industry") or None,
        valuation=valuation,
        growth=growth,
        statements=statements,
        revenueTrend=[],
        fundamentalScore=score,
        scoreBreakdown=breakdown,
        summary=_summary(name, score, breakdown),
        source="yfinance",
        updatedAt=_now(),
        dataAvailable=data_available,
        notes=notes,
    )


async def analyze(symbol: str, settings: Settings) -> FundamentalAnalysis:
    if finmind_client.is_taiwan_symbol(symbol):
        return await _build_taiwan(symbol, settings)
    return await _build_us(symbol)
