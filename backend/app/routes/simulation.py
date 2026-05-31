from fastapi import APIRouter, Depends

from app.firebase_admin import get_current_user
from app.schemas import SimulationRequest, SimulationResult
from app.services.portfolio_engine import generate_candidates, generate_portfolio
from app.services.simulation_engine import run_monte_carlo

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.post("/run", response_model=SimulationResult)
def run_simulation(payload: SimulationRequest, _: str = Depends(get_current_user)) -> SimulationResult:
    assets = generate_portfolio(payload.portfolio.riskLevel)
    candidates = generate_candidates(payload.portfolio.riskLevel)
    return run_monte_carlo(
        initial_capital=payload.portfolio.totalCapital,
        target_monthly_income=payload.portfolio.targetMonthlyIncome,
        years=payload.portfolio.investmentYears,
        assets=assets,
        candidates=candidates,
        simulations=payload.simulations,
        seed=payload.seed,
    )
