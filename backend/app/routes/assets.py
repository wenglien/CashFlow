from fastapi import APIRouter

from app.schemas import AssetAllocation
from app.services.portfolio_engine import PORTFOLIO_TEMPLATES

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("/{risk_level}", response_model=list[AssetAllocation])
def get_assets(risk_level: str) -> list[AssetAllocation]:
    return PORTFOLIO_TEMPLATES.get(risk_level, PORTFOLIO_TEMPLATES["balanced"])
