import pytest

from app.config import Settings
from app.services.market_ai import answer_market_question
from app.services.market_data import get_market_snapshot


@pytest.mark.anyio
async def test_market_ai_returns_local_answer_without_ai_key() -> None:
    settings = Settings(ai_provider="openai", openai_api_key=None, groq_api_key=None)
    snapshot = await get_market_snapshot(["SPY", "QQQ"], settings)
    response = await answer_market_question("請比較風險", snapshot, settings)

    assert response.source == "local"
    assert "SPY" in response.answer or "QQQ" in response.answer
    assert response.answer
