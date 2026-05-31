"""Phase 3:綜合分析聚合器。

整合基本面(fundamental_engine)與籌碼面(chip_engine):
- 計算總評分(台股=基本面 60% + 籌碼 40%;美股=基本面 100%)
- 組出雷達圖維度
- 產生 AI 多空論點報告(沿用 OpenAI Responses / Groq,失敗時走本地規則 fallback)

本檔僅做分析,不提供投資建議。
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

import httpx

from app.config import Settings
from app.schemas import (
    AiReport,
    ChipAnalysis,
    ComprehensiveAnalysis,
    FundamentalAnalysis,
    RadarAxis,
)
from app.services import chip_engine, fundamental_engine
from app.services.data_providers import finmind_client


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _rating(score: int) -> str:
    if score >= 75:
        return "優異"
    if score >= 60:
        return "良好"
    if score >= 45:
        return "中性"
    return "偏弱"


def _total_score(fundamental: FundamentalAnalysis, chip: ChipAnalysis | None) -> int:
    if chip and chip.available:
        return round(fundamental.fundamentalScore * 0.6 + chip.chipScore * 0.4)
    return fundamental.fundamentalScore


def _radar(fundamental: FundamentalAnalysis, chip: ChipAnalysis | None) -> list[RadarAxis]:
    axes = [RadarAxis(axis=item.label, score=item.score) for item in fundamental.scoreBreakdown]
    if chip and chip.available:
        axes.extend(RadarAxis(axis=item.label, score=item.score) for item in chip.scoreBreakdown)
    return axes


# ---- AI 報告 ----

def _facts_block(fundamental: FundamentalAnalysis, chip: ChipAnalysis | None) -> str:
    v = fundamental.valuation
    g = fundamental.growth
    lines = [
        f"標的:{fundamental.name}({fundamental.symbol}),市場:{fundamental.market},產業:{fundamental.industry or '—'}",
        f"基本面評分:{fundamental.fundamentalScore}/100",
        f"估值:本益比 {v.per}、股價淨值比 {v.pbr}、殖利率 {v.dividendYield}%、ROE {v.roe}",
        f"成長:營收年增 {g.revenueYoyPercent}%、近四季EPS {g.ttmEps}、EPS年增 {g.epsYoyPercent}%",
    ]
    for item in fundamental.scoreBreakdown:
        lines.append(f"  - 基本面/{item.label}:{item.score} 分({item.detail})")
    if chip and chip.available:
        m = chip.metrics
        lines.append(f"籌碼面評分:{chip.chipScore}/100")
        lines.append(
            f"籌碼:外資近5日 {m.foreignNet5d} 張、近20日 {m.foreignNet20d} 張、投信近5日 {m.trustNet5d} 張、"
            f"外資連續 {m.consecutiveForeignDays} 日、融資5日變化 {m.marginChange5dPercent}%、"
            f"券資比 {m.shortMarginRatio}%、外資持股 {m.foreignHoldingPercent}%"
        )
        for item in chip.scoreBreakdown:
            lines.append(f"  - 籌碼/{item.label}:{item.score} 分({item.detail})")
    return "\n".join(lines)


def _local_report(fundamental: FundamentalAnalysis, chip: ChipAnalysis | None, total: int) -> AiReport:
    bulls: list[str] = []
    bears: list[str] = []
    items = list(fundamental.scoreBreakdown)
    if chip and chip.available:
        items += chip.scoreBreakdown
    for item in items:
        if item.score >= 65:
            bulls.append(f"{item.label}:{item.detail}")
        elif item.score <= 45:
            bears.append(f"{item.label}:{item.detail}")
    if not bulls:
        bulls.append("目前各構面無明顯強項,屬中性格局。")
    if not bears:
        bears.append("目前各構面無明顯弱項,但仍須留意估值與市場系統性風險。")
    summary = (
        f"{fundamental.name} 綜合評分 {total} 分({_rating(total)})。"
        f"基本面 {fundamental.fundamentalScore} 分"
        + (f"、籌碼面 {chip.chipScore} 分" if chip and chip.available else "")
        + "。建議搭配情境壓力測試與分散配置,本報告為教育用途,非投資建議。"
    )
    return AiReport(summary=summary, bullPoints=bulls, bearPoints=bears, source="local", model=None)


def _parse_ai_json(text: str) -> dict | None:
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```", 2)[1] if "```" in cleaned else cleaned
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError:
        return None


_INSTRUCTIONS = (
    "你是 CashFlow 的繁體中文股票分析助理。"
    "根據提供的基本面與籌碼面數據,產生一份客觀的綜合分析。"
    "只能依據提供的數據,不要捏造數字,不要保證報酬,不要給明確買賣指令。"
    "務必只輸出 JSON,格式為:"
    '{"summary": "三到四句綜合總結", "bullPoints": ["利多1", "利多2", "利多3"], "bearPoints": ["利空1", "利空2"]}'
)


async def _generate_ai_report(
    fundamental: FundamentalAnalysis, chip: ChipAnalysis | None, total: int, settings: Settings
) -> AiReport:
    facts = _facts_block(fundamental, chip)
    user_input = f"以下為 {fundamental.name} 的分析數據,綜合評分 {total} 分:\n{facts}"
    provider = settings.ai_provider.lower().strip()
    # 金鑰可能來自 Secret Manager 帶尾端換行,務必 strip 後再放進 header。
    groq_key = settings.groq_api_key.strip() if settings.groq_api_key else ""
    openai_key = settings.openai_api_key.strip() if settings.openai_api_key else ""

    try:
        if provider == "groq" and groq_key:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                    json={
                        "model": settings.groq_model,
                        "messages": [
                            {"role": "system", "content": _INSTRUCTIONS},
                            {"role": "user", "content": user_input},
                        ],
                        "temperature": 0.3,
                        "max_tokens": 800,
                        "response_format": {"type": "json_object"},
                    },
                )
            response.raise_for_status()
            text = response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            data = _parse_ai_json(text)
            if data:
                return AiReport(
                    summary=data.get("summary", ""),
                    bullPoints=data.get("bullPoints", []),
                    bearPoints=data.get("bearPoints", []),
                    source="groq",
                    model=f"groq/{settings.groq_model}",
                )
        elif openai_key:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    "https://api.openai.com/v1/responses",
                    headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                    json={
                        "model": settings.openai_model,
                        "instructions": _INSTRUCTIONS,
                        "input": user_input,
                        "max_output_tokens": 800,
                    },
                )
            response.raise_for_status()
            payload = response.json()
            text = payload.get("output_text") or ""
            if not text:
                for item in payload.get("output", []):
                    for content in item.get("content", []):
                        if isinstance(content.get("text"), str):
                            text += content["text"]
            data = _parse_ai_json(text)
            if data:
                return AiReport(
                    summary=data.get("summary", ""),
                    bullPoints=data.get("bullPoints", []),
                    bearPoints=data.get("bearPoints", []),
                    source="openai",
                    model=settings.openai_model,
                )
    except Exception:
        pass

    return _local_report(fundamental, chip, total)


async def analyze(symbol: str, settings: Settings) -> ComprehensiveAnalysis:
    is_tw = finmind_client.is_taiwan_symbol(symbol)
    if is_tw:
        fundamental, chip = await asyncio.gather(
            fundamental_engine.analyze(symbol, settings),
            chip_engine.analyze(symbol, settings),
        )
    else:
        fundamental = await fundamental_engine.analyze(symbol, settings)
        chip = None

    chip_for_total = chip if (chip and chip.available) else None
    total = _total_score(fundamental, chip_for_total)
    radar = _radar(fundamental, chip_for_total)
    ai_report = await _generate_ai_report(fundamental, chip_for_total, total, settings)

    return ComprehensiveAnalysis(
        symbol=fundamental.symbol,
        name=fundamental.name,
        market=fundamental.market,
        totalScore=total,
        rating=_rating(total),
        radar=radar,
        fundamental=fundamental,
        chip=chip_for_total,
        aiReport=ai_report,
        updatedAt=_now(),
    )
