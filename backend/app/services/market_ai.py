from datetime import datetime, timezone
import json
from typing import Any

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


def _compact_json(value: Any, limit: int = 5000) -> str:
    try:
        text = json.dumps(value, ensure_ascii=False, indent=2, default=str)
    except TypeError:
        text = str(value)
    return text[:limit]


def _format_list_items(items: Any, *, key_fields: tuple[str, ...], limit: int = 12) -> list[str]:
    if not isinstance(items, list):
        return []
    lines: list[str] = []
    for item in items[:limit]:
        if isinstance(item, dict):
            parts = [f"{field}={item.get(field)}" for field in key_fields if item.get(field) not in (None, "")]
            if parts:
                lines.append("- " + ", ".join(parts))
        elif item:
            lines.append(f"- {item}")
    return lines


def _format_page_context(page_context: dict[str, Any] | None) -> str:
    if not page_context:
        return "目前沒有額外頁面脈絡。"

    title = str(page_context.get("title", "")).strip()
    url = str(page_context.get("url", "")).strip()
    route = str(page_context.get("route", "")).strip()
    captured_at = str(page_context.get("capturedAt", "")).strip()
    content = str(page_context.get("visibleText", "")).strip()[:2500]
    parts: list[str] = []
    if title:
        parts.append(f"頁面標題：{title}")
    if url:
        parts.append(f"目前 URL：{url}")
    if route:
        parts.append(f"目前路由：{route}")
    if captured_at:
        parts.append(f"頁面擷取時間：{captured_at}")

    app_state = page_context.get("appState")
    if app_state:
        parts.append("頁面應用狀態（React state，優先使用）：\n" + _compact_json(app_state, 6500))

    form_lines = _format_list_items(page_context.get("formFields"), key_fields=("label", "value", "type"), limit=20)
    if form_lines:
        parts.append("目前表單欄位：\n" + "\n".join(form_lines))

    metric_lines = _format_list_items(page_context.get("metrics"), key_fields=("section", "label", "value"), limit=18)
    if metric_lines:
        parts.append("頁面關鍵指標：\n" + "\n".join(metric_lines))

    section_lines = _format_list_items(page_context.get("sections"), key_fields=("title", "text"), limit=8)
    if section_lines:
        parts.append("頁面區塊摘要：\n" + "\n".join(section_lines))

    if content:
        parts.append(f"頁面可見文字備援：\n{content}")
    return "\n".join(parts) if parts else "目前沒有額外頁面脈絡。"


def _local_answer(question: str, snapshot: MarketSnapshot, page_context: dict[str, Any] | None = None) -> str:
    sorted_quotes = sorted(snapshot.quotes, key=lambda quote: quote.changePercent, reverse=True)
    best = sorted_quotes[0]
    weakest = sorted_quotes[-1]
    caution_count = sum(1 for quote in snapshot.quotes if quote.signal == "caution")
    bullish_count = sum(1 for quote in snapshot.quotes if quote.signal == "bullish")
    avg_change = sum(quote.changePercent for quote in snapshot.quotes) / len(snapshot.quotes)
    simulation_guidance = ""
    page_hint = ""
    if page_context:
        title = str(page_context.get("title", "")).strip()
        app_state = page_context.get("appState")
        if isinstance(app_state, dict):
            flow_status = app_state.get("flowStatus")
            portfolio_input = app_state.get("portfolioInput")
            page_hint = f"我也讀到你目前頁面「{title or 'CashFlow'}」的狀態：{flow_status or '已取得頁面狀態'}。"
            if isinstance(portfolio_input, dict):
                total_capital = float(portfolio_input.get("totalCapital") or 0)
                target_monthly_income = float(portfolio_input.get("targetMonthlyIncome") or 0)
                annual_income_target = float(portfolio_input.get("annualIncomeTarget") or target_monthly_income * 12)
                withdrawal_rate = annual_income_target / total_capital if total_capital > 0 else 0
                page_hint += (
                    f" 目前本金 {portfolio_input.get('totalCapital')}、目標月收入 {portfolio_input.get('targetMonthlyIncome')}、"
                    f"風險設定 {portfolio_input.get('riskLabel') or portfolio_input.get('riskLevel')}。"
                )
                simulation_guidance = (
                    f"就目前模擬頁來看，年化收入目標約 {annual_income_target:,.0f}，"
                    f"相當於本金的 {withdrawal_rate * 100:.1f}% 提領率。"
                    "下一步應先看這個提領率是否合理，再執行模擬確認成功率、最大回撤與股息覆蓋率。"
                )
            simulation_result = app_state.get("simulationResult")
            if isinstance(simulation_result, dict):
                summary = simulation_result.get("summary")
                diagnostics = simulation_result.get("diagnostics")
                if isinstance(summary, dict) and isinstance(diagnostics, dict):
                    simulation_guidance = (
                        f"目前模擬結果顯示成功率約 {float(summary.get('successRate') or 0) * 100:.0f}%、"
                        f"最大回撤約 {float(summary.get('maxDrawdown') or 0) * 100:.0f}%、"
                        f"目標提領率約 {float(diagnostics.get('withdrawalRate') or 0) * 100:.1f}%。"
                        "下一步應優先檢查成功率是否足夠、回撤是否能承受，以及配置藍圖是否過度集中在高波動部位。"
                    )
        else:
            visible_text = str(page_context.get("visibleText", "")).strip()
            if title or visible_text:
                page_hint = f"我也會參考你目前頁面「{title or 'CashFlow'}」上看到的內容，例如目前頁面的表單、摘要或分析結果。"

    return (
        f"根據目前所選 {len(snapshot.quotes)} 檔標的，平均漲跌幅約 {avg_change:.2f}%。"
        f"相對強勢的是 {best.symbol}（{best.changePercent:.2f}%），相對弱勢的是 {weakest.symbol}（{weakest.changePercent:.2f}%）。"
        f"清單中有 {bullish_count} 檔偏多、{caution_count} 檔需要謹慎觀察。\n\n"
        f"{page_hint}\n"
        f"{simulation_guidance}\n\n"
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
    page_context: dict[str, Any] | None = None,
) -> MarketChatResponse:
    provider = settings.ai_provider.lower().strip()
    if provider == "groq":
        return await _answer_with_groq(question, snapshot, settings, page_context)
    openai_api_key = settings.openai_api_key.strip() if settings.openai_api_key else ""
    if not openai_api_key:
        return MarketChatResponse(answer=_local_answer(question, snapshot, page_context), source="local", model=None, updatedAt=_now())

    instructions = (
        "你是 CashFlow 的繁體中文投資分析助理。"
        "你要根據提供的市場快照與目前頁面脈絡回答。頁面脈絡包含結構化 React state、表單欄位、頁面指標與可見文字。"
        "若 React state、表單欄位與可見文字互相衝突，優先使用 React state，其次表單欄位，再其次可見文字。"
        "如果使用者問題和目前頁面內容有關，必須引用頁面上具體數值或狀態，例如本金、目標收入、風險設定、成功率、回撤、配置藍圖。"
        "市場問題則重點放在漲跌、日內區間、成交量、股息率、分散度與風險。"
        "不要聲稱能預測未來，不要給明確買進、賣出、保證報酬或個人化投資指令。"
        "回答需條理清楚、繁體中文、適合新手投資者。"
    )
    input_text = (
        f"使用者問題：{question}\n\n"
        f"目前頁面脈絡：\n{_format_page_context(page_context)}\n\n"
        f"市場摘要：{snapshot.summary}\n"
        f"資料更新時間：{snapshot.updatedAt}\n"
        f"所選標的：\n{_quote_lines(snapshot)}"
    )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                headers={
                    "Authorization": f"Bearer {openai_api_key}",
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
        return MarketChatResponse(answer=_local_answer(question, snapshot, page_context), source="local", model=None, updatedAt=_now())

    return MarketChatResponse(
        answer=answer or _local_answer(question, snapshot, page_context),
        source="openai",
        model=settings.openai_model,
        updatedAt=_now(),
    )


async def _answer_with_groq(
    question: str,
    snapshot: MarketSnapshot,
    settings: Settings,
    page_context: dict[str, Any] | None = None,
) -> MarketChatResponse:
    groq_api_key = settings.groq_api_key.strip() if settings.groq_api_key else ""
    if not groq_api_key:
        return MarketChatResponse(answer=_local_answer(question, snapshot, page_context), source="local", model=None, updatedAt=_now())

    system_prompt = (
        "你是 CashFlow 的繁體中文投資分析助理。"
        "你要根據提供的市場快照與目前頁面脈絡回答。頁面脈絡包含結構化 React state、表單欄位、頁面指標與可見文字。"
        "若 React state、表單欄位與可見文字互相衝突，優先使用 React state，其次表單欄位，再其次可見文字。"
        "如果使用者問題和目前頁面內容有關，必須引用頁面上具體數值或狀態，例如本金、目標收入、風險設定、成功率、回撤、配置藍圖。"
        "市場問題則重點放在漲跌、日內區間、成交量、股息率、分散度與風險。"
        "不要聲稱能預測未來，不要給明確買進、賣出、保證報酬或個人化投資指令。"
        "回答需條理清楚、繁體中文、適合新手投資者。"
    )
    user_prompt = (
        f"使用者問題：{question}\n\n"
        f"目前頁面脈絡：\n{_format_page_context(page_context)}\n\n"
        f"市場摘要：{snapshot.summary}\n"
        f"資料更新時間：{snapshot.updatedAt}\n"
        f"所選標的：\n{_quote_lines(snapshot)}"
    )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
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
        return MarketChatResponse(answer=_local_answer(question, snapshot, page_context), source="local", model=None, updatedAt=_now())

    return MarketChatResponse(
        answer=answer or _local_answer(question, snapshot, page_context),
        source="groq",
        model=f"groq/{settings.groq_model}",
        updatedAt=_now(),
    )
