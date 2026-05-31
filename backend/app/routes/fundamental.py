from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.firebase_admin import get_current_user
from app.schemas import FundamentalAnalysis
from app.services import fundamental_engine

router = APIRouter(prefix="/api/fundamental", tags=["fundamental"])


@router.get("/{symbol}", response_model=FundamentalAnalysis)
async def fundamental_analysis(
    symbol: str,
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> FundamentalAnalysis:
    cleaned = symbol.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="symbol 不可為空")
    try:
        return await fundamental_engine.analyze(cleaned, settings)
    except Exception as exc:  # 對外回傳乾淨錯誤,細節留在伺服器日誌。
        raise HTTPException(status_code=502, detail=f"取得基本面資料失敗:{exc}") from exc
