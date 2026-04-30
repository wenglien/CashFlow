from fastapi import APIRouter, Depends

from app.firebase_admin import get_current_user
from app.schemas import Portfolio, PortfolioCreate
from app.services.portfolio_engine import generate_portfolio
from app.utils.helpers import new_id

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.post("", response_model=Portfolio)
def create_portfolio(payload: PortfolioCreate, user_id: str = Depends(get_current_user)) -> Portfolio:
    return Portfolio(
        id=new_id("portfolio"),
        userId=user_id,
        assets=generate_portfolio(payload.riskLevel),
        **payload.model_dump(),
    )


@router.get("/{portfolio_id}", response_model=Portfolio)
def get_portfolio(portfolio_id: str, user_id: str = Depends(get_current_user)) -> Portfolio:
    sample = PortfolioCreate(
        totalCapital=100000,
        targetMonthlyIncome=400,
        investmentYears=20,
        riskLevel="balanced",
        currency="TWD",
    )
    return Portfolio(id=portfolio_id, userId=user_id, assets=generate_portfolio(sample.riskLevel), **sample.model_dump())
