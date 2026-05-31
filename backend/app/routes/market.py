from fastapi import APIRouter, Depends, Query

from app.config import Settings, get_settings
from app.firebase_admin import get_current_user
from app.schemas import MarketSnapshot
from app.services.market_data import DEFAULT_WATCHLIST_SYMBOLS, get_market_snapshot

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/snapshot", response_model=MarketSnapshot)
async def market_snapshot(
    symbols: str = Query(default=""),
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> MarketSnapshot:
    requested_symbols = symbols.split(",") if symbols else list(DEFAULT_WATCHLIST_SYMBOLS)
    return await get_market_snapshot(requested_symbols, settings)
