from datetime import datetime, timezone

import httpx

from app.config import Settings
from app.schemas import MarketChatResponse, MarketSnapshot


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _quote_lines(snapshot: MarketSnapshot) -> str:
    return "\n".join(
        [
            (
                f"- {quote.symbol} {quote.name}: price={quote.price}, change={quote.changePercent:.2f}%, "
                f"open={quote.open}, high={quote.high}, low={quote.low}, previous_close={quote.previousClose}, "
                f"volume={quote.volume}, dividend_yield={quote.dividendYield}, signal={quote.signal}, "
                f"analysis={quote.analysis}"
            )
            for quote in snapshot.quotes
        ]
    )


def _local_answer(question: str, snapshot: MarketSnapshot) -> str:
    sorted_quotes = sorted(snapshot.quotes, key=lambda quote: quote.changePercent, reverse=True)
    best = sorted_quotes[0]
    weakest = sorted_quotes[-1]
    caution_count = sum(1 for quote in snapshot.quotes if quote.signal == "caution")
    bullish_count = sum(1 for quote in snapshot.quotes if quote.signal == "bullish")
    avg_change = sum(quote.changePercent for quote in snapshot.quotes) / len(snapshot.quotes)

    return (
        f"根據目前所選 {len(snapshot.quotes)} 檔標的，平均漲跌幅約 {avg_change:.2f}%。"
        f"相對強勢的是 {best.symbol}（{best.changePercent:.2f}%），相對弱勢的是 {weakest.symbol}（{weakest.changePercent:.2f}%）。"
        f"清單中有 {bullish_count} 檔偏多、{caution_count} 檔需要謹慎觀察。\n\n"
        f"針對你的問題「{question}」，我會先看三件事：第一，漲跌幅是否集中在少數標的；第二，價格是否接近日內高低區間；"
        "第三，成交量壓力是否支持目前方向。若你要做現金流或長期配置，請優先比較股息率、波動與分散度，而不是只看單日漲跌。\n\n"
        "提醒：這是教育用途的市場分析，不是個人化投資建議。"
    )


def _extract_response_text(payload: dict) -> str:
    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    parts: list[str] = []
    for item in payload.get("output", []):
        for content in item.get("content", []):
            text = content.get("text")
            if isinstance(text, str):
                parts.append(text)
    return "\n".join(parts).strip()


async def answer_market_question(
    question: str,
    snapshot: MarketSnapshot,
    settings: Settings,
) -> MarketChatResponse:
    provider = settings.ai_provider.lower().strip()
    if provider == "groq":
        return await _answer_with_groq(question, snapshot, settings)
    if not settings.openai_api_key:
        return MarketChatResponse(answer=_local_answer(question, snapshot), source="local", model=None, updatedAt=_now())

    instructions = (
        "你是 CashFlow 的繁體中文投資分析助理。"
        "你只能根據提供的市場快照回答，重點放在漲跌、日內區間、成交量、股息率、分散度與風險。"
        "不要聲稱能預測未來，不要給明確買進、賣出、保證報酬或個人化投資指令。"
        "回答需條理清楚、繁體中文、適合新手投資者。"
    )
    input_text = (
        f"使用者問題：{question}\n\n"
        f"市場摘要：{snapshot.summary}\n"
        f"資料更新時間：{snapshot.updatedAt}\n"
        f"所選標的：\n{_quote_lines(snapshot)}"
    )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openai_model,
                    "instructions": instructions,
                    "input": input_text,
                    "max_output_tokens": 700,
                },
            )
        response.raise_for_status()
        answer = _extract_response_text(response.json())
    except Exception:
        return MarketChatResponse(answer=_local_answer(question, snapshot), source="local", model=None, updatedAt=_now())

    return MarketChatResponse(
        answer=answer or _local_answer(question, snapshot),
        source="openai",
        model=settings.openai_model,
        updatedAt=_now(),
    )


async def _answer_with_groq(
    question: str,
    snapshot: MarketSnapshot,
    settings: Settings,
) -> MarketChatResponse:
    if not settings.groq_api_key:
        return MarketChatResponse(answer=_local_answer(question, snapshot), source="local", model=None, updatedAt=_now())

    system_prompt = (
        "你是 CashFlow 的繁體中文投資分析助理。"
        "你只能根據提供的市場快照回答，重點放在漲跌、日內區間、成交量、股息率、分散度與風險。"
        "不要聲稱能預測未來，不要給明確買進、賣出、保證報酬或個人化投資指令。"
        "回答需條理清楚、繁體中文、適合新手投資者。"
    )
    user_prompt = (
        f"使用者問題：{question}\n\n"
        f"市場摘要：{snapshot.summary}\n"
        f"資料更新時間：{snapshot.updatedAt}\n"
        f"所選標的：\n{_quote_lines(snapshot)}"
    )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.groq_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.35,
                    "max_tokens": 700,
                },
            )
        response.raise_for_status()
        payload = response.json()
        answer = payload.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    except Exception:
        return MarketChatResponse(answer=_local_answer(question, snapshot), source="local", model=None, updatedAt=_now())

    return MarketChatResponse(
        answer=answer or _local_answer(question, snapshot),
        source="groq",
        model=f"groq/{settings.groq_model}",
        updatedAt=_now(),
    )
