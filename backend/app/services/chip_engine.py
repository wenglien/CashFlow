"""籌碼面分析引擎(台股,資料來源 FinMind)。

計算:
- 三大法人近 5/20 日淨買賣(張)與外資連續買賣超天數
- 融資餘額變化(散戶情緒,常作反向指標)、券資比
- 外資持股比率與近 20 日變化
- 籌碼評分(法人動向 / 散戶籌碼 / 外資持股 三項加權)

美股無對等免費籌碼資料,對非台股代號回傳 available=False。
本檔僅做分析,不提供投資建議。
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.config import Settings
from app.schemas import (
    ChipAnalysis,
    ChipMetrics,
    ForeignHoldingPoint,
    InstitutionalPoint,
    MarginPoint,
    ScoreItem,
)
from app.services.data_providers import finmind_client

SHARES_PER_LOT = 1000  # 1 張 = 1000 股


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_lots(shares: float) -> float:
    return round(shares / SHARES_PER_LOT)


def _sum_net(flows: list[dict], key: str, days: int) -> float:
    return round(sum(item[key] for item in flows[:days]) / SHARES_PER_LOT)


def _consecutive_days(flows: list[dict], key: str) -> int:
    """從最新往回數,回傳同向連續天數(買超為正、賣超為負)。"""
    if not flows:
        return 0
    first = flows[0][key]
    if first == 0:
        return 0
    sign = 1 if first > 0 else -1
    count = 0
    for item in flows:
        value = item[key]
        if (value > 0 and sign > 0) or (value < 0 and sign < 0):
            count += 1
        else:
            break
    return count * sign


def _score_institutional(metrics: ChipMetrics) -> tuple[int, str]:
    net20 = metrics.foreignNet20d
    net5 = metrics.foreignNet5d
    trust5 = metrics.trustNet5d
    if net20 is None and net5 is None:
        return 50, "缺少法人資料,以中性計分。"
    score = 70 if (net20 or 0) > 0 else 40
    if (net5 or 0) > 0:
        score += 12
    else:
        score -= 8
    if (trust5 or 0) > 0:
        score += 8
    score = max(15, min(92, score))
    dir_text = "買超" if (net20 or 0) > 0 else "賣超"
    return score, f"外資近 20 日{dir_text} {abs(net20 or 0):,.0f} 張、投信近 5 日 {trust5 or 0:,.0f} 張"


def _score_retail(metrics: ChipMetrics) -> tuple[int, str]:
    change = metrics.marginChange5dPercent
    if change is None:
        return 50, "缺少融資資料,以中性計分。"
    if change <= -3:
        score = 75
    elif change <= 3:
        score = 60
    elif change <= 10:
        score = 45
    else:
        score = 32
    trend = "增加" if change > 0 else "減少"
    return score, f"融資餘額近 5 日{trend} {abs(change):.1f}%(融資增加多視為散戶追價)"


def _score_foreign_holding(metrics: ChipMetrics) -> tuple[int, str]:
    change = metrics.foreignHoldingChange20d
    if change is None:
        return 50, "缺少外資持股資料,以中性計分。"
    if change > 0.3:
        score = 78
    elif change >= -0.3:
        score = 55
    else:
        score = 40
    trend = "上升" if change > 0 else "下降" if change < 0 else "持平"
    return score, f"外資持股近 20 日{trend} {abs(change):.2f} 個百分點"


def _build_score(metrics: ChipMetrics) -> tuple[int, list[ScoreItem]]:
    specs = [
        ("法人動向", 0.45, _score_institutional(metrics)),
        ("散戶籌碼", 0.30, _score_retail(metrics)),
        ("外資持股", 0.25, _score_foreign_holding(metrics)),
    ]
    breakdown = [
        ScoreItem(label=label, score=result[0], weight=weight, detail=result[1])
        for label, weight, result in specs
    ]
    overall = round(sum(item.score * item.weight for item in breakdown))
    return overall, breakdown


def _summary(name: str, score: int, metrics: ChipMetrics) -> str:
    if score >= 72:
        tone = "籌碼面偏向有利,法人與籌碼結構提供支撐"
    elif score >= 55:
        tone = "籌碼面中性,需留意法人態度變化"
    elif score >= 42:
        tone = "籌碼面略偏弱,留意法人賣壓或散戶追價"
    else:
        tone = "籌碼面偏弱,法人動向與散戶結構需謹慎"
    consec = metrics.consecutiveForeignDays
    consec_text = (
        f"外資已連續 {abs(consec)} 日{'買超' if consec > 0 else '賣超'}。" if consec else ""
    )
    return f"{name} 籌碼評分 {score} 分,{tone}。{consec_text}本分析僅供教育參考,非投資建議。"


async def analyze(symbol: str, settings: Settings) -> ChipAnalysis:
    name = finmind_client.to_stock_id(symbol)
    if not finmind_client.is_taiwan_symbol(symbol):
        return ChipAnalysis(
            symbol=symbol.upper(),
            name=symbol.upper(),
            market="US",
            available=False,
            metrics=ChipMetrics(),
            chipScore=0,
            scoreBreakdown=[],
            summary="美股無對等的免費籌碼(法人買賣)資料,籌碼面分析僅支援台股。",
            source="none",
            updatedAt=_now(),
            notes=["籌碼面僅支援台股。"],
        )

    token = settings.finmind_token
    info = await finmind_client.get_stock_info(symbol, token)
    flows = await finmind_client.get_institutional_flow(symbol, token)
    margins = await finmind_client.get_margin_short(symbol, token)
    holdings = await finmind_client.get_foreign_holding(symbol, token)
    name = info.get("name", name)

    # 法人指標。
    metrics = ChipMetrics()
    if flows:
        metrics.foreignNet5d = _sum_net(flows, "foreign", 5)
        metrics.foreignNet20d = _sum_net(flows, "foreign", 20)
        metrics.trustNet5d = _sum_net(flows, "trust", 5)
        metrics.dealerNet5d = _sum_net(flows, "dealer", 5)
        metrics.consecutiveForeignDays = _consecutive_days(flows, "foreign")

    # 融資融券指標。
    if margins:
        latest_margin = margins[0].get("marginBalance")
        metrics.marginBalance = latest_margin
        if len(margins) > 5 and margins[5].get("marginBalance"):
            base = margins[5]["marginBalance"]
            if base:
                metrics.marginChange5dPercent = round((latest_margin - base) / base * 100, 2)
        latest_short = margins[0].get("shortBalance")
        if latest_margin and latest_short is not None and latest_margin > 0:
            metrics.shortMarginRatio = round(latest_short / latest_margin * 100, 2)

    # 外資持股指標。
    if holdings:
        metrics.foreignHoldingPercent = holdings[0]["ratio"]
        ref_index = min(20, len(holdings) - 1)
        if ref_index > 0:
            metrics.foreignHoldingChange20d = round(holdings[0]["ratio"] - holdings[ref_index]["ratio"], 2)

    available = bool(flows or margins or holdings)
    score, breakdown = _build_score(metrics)

    return ChipAnalysis(
        symbol=finmind_client.to_stock_id(symbol),
        name=name,
        market="TW",
        available=available,
        metrics=metrics,
        institutionalTrend=[
            InstitutionalPoint(
                date=item["date"],
                foreign=_to_lots(item["foreign"]),
                trust=_to_lots(item["trust"]),
                dealer=_to_lots(item["dealer"]),
            )
            for item in reversed(flows[:40])
        ],
        marginTrend=[
            MarginPoint(date=item["date"], marginBalance=item["marginBalance"], shortBalance=item["shortBalance"])
            for item in reversed(margins[:40])
        ],
        foreignHoldingTrend=[
            ForeignHoldingPoint(date=item["date"], ratio=item["ratio"]) for item in reversed(holdings[:40])
        ],
        chipScore=score,
        scoreBreakdown=breakdown,
        summary=_summary(name, score, metrics) if available else "FinMind 未回傳此代號的籌碼資料。",
        source="finmind",
        updatedAt=_now(),
        notes=[] if available else ["FinMind 未回傳籌碼資料,可能為非上市或額度受限。"],
    )
