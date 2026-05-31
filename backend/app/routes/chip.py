from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.firebase_admin import get_current_user
from app.schemas import ChipAnalysis
from app.services import chip_engine

router = APIRouter(prefix="/api/chip", tags=["chip"])


@router.get("/{symbol}", response_model=ChipAnalysis)
async def chip_analysis(
    symbol: str,
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> ChipAnalysis:
    cleaned = symbol.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="symbol 不可為空")
    try:
        return await chip_engine.analyze(cleaned, settings)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"取得籌碼資料失敗:{exc}") from exc
