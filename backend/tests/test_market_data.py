import pytest

from app.config import Settings
from app.services.market_data import get_market_snapshot


@pytest.mark.anyio
async def test_market_snapshot_returns_quotes_without_api_key() -> None:
    snapshot = await get_market_snapshot(["SPY", "QQQ"], Settings(finnhub_api_key=None))

    assert len(snapshot.quotes) == 2
    assert snapshot.source == "demo"
    assert snapshot.quotes[0].symbol == "SPY"
    assert snapshot.summary
