from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.firebase_admin import get_current_user
from app.schemas import BacktestRequest, BacktestResult, ScreenerRequest, ScreenerResult
from app.services import quant_engine

router = APIRouter(prefix="/api/quant", tags=["quant"])


@router.post("/backtest", response_model=BacktestResult)
async def run_backtest(
    payload: BacktestRequest,
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> BacktestResult:
    try:
        return await quant_engine.backtest(payload, settings)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"回測失敗:{exc}") from exc


@router.post("/screener", response_model=ScreenerResult)
async def run_screener(
    payload: ScreenerRequest,
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> ScreenerResult:
    try:
        return await quant_engine.screen(payload, settings)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"選股失敗:{exc}") from exc
