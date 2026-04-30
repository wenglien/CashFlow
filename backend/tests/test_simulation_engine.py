from app.services.portfolio_engine import generate_portfolio
from app.services.simulation_engine import run_monte_carlo


def test_simulation_returns_expected_metrics() -> None:
    result = run_monte_carlo(
        initial_capital=100_000,
        target_monthly_income=300,
        years=10,
        assets=generate_portfolio("balanced"),
        simulations=500,
        seed=1,
    )

    assert 0 <= result.successRate <= 1
    assert result.projectedFinalValue >= 0
    assert result.worstCaseValue >= 0
    assert len(result.growth) == 11
