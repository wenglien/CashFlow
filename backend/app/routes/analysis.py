from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.firebase_admin import get_current_user
from app.schemas import ComprehensiveAnalysis
from app.services import analysis_aggregator

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.get("/{symbol}", response_model=ComprehensiveAnalysis)
async def comprehensive_analysis(
    symbol: str,
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> ComprehensiveAnalysis:
    cleaned = symbol.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="symbol 不可為空")
    try:
        return await analysis_aggregator.analyze(cleaned, settings)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"綜合分析失敗:{exc}") from exc
