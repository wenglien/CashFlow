from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.firebase_admin import get_current_user
from app.schemas import MarketChatRequest, MarketChatResponse
from app.services.market_ai import answer_market_question
from app.services.market_data import get_market_snapshot

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/market-chat", response_model=MarketChatResponse)
async def market_chat(
    payload: MarketChatRequest,
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> MarketChatResponse:
    snapshot = await get_market_snapshot(payload.symbols, settings)
    return await answer_market_question(payload.question, snapshot, settings, payload.pageContext)
