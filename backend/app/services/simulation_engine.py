import numpy as np

from app.schemas import AssetAllocation, GrowthPoint, InvestmentCandidate, SimulationDiagnostics, SimulationResult
from app.utils.finance_math import annual_to_monthly_income, weighted_average


def _portfolio_assumptions(assets: list[AssetAllocation]) -> tuple[float, float, float]:
    weights = [asset.allocationPercent / 100 for asset in assets]
    expected_return = weighted_average([asset.expectedReturn for asset in assets], weights)
    dividend_yield = weighted_average([asset.dividendYield for asset in assets], weights)
    variance = sum((weight * asset.volatility) ** 2 for weight, asset in zip(weights, assets))
    return expected_return, float(np.sqrt(variance)), dividend_yield


def run_monte_carlo(
    initial_capital: float,
    target_monthly_income: float,
    years: int,
    assets: list[AssetAllocation],
    candidates: list[InvestmentCandidate] | None = None,
    simulations: int = 3000,
    seed: int | None = 42,
) -> SimulationResult:
    candidates = candidates or []
    expected_return, volatility, dividend_yield = _portfolio_assumptions(assets)
    annual_withdrawal = target_monthly_income * 12
    rng = np.random.default_rng(seed)

    paths = np.zeros((simulations, years + 1))
    paths[:, 0] = initial_capital
    max_drawdowns = np.zeros(simulations)

    for simulation_index in range(simulations):
        peak = initial_capital
        current = initial_capital

        for year in range(1, years + 1):
            yearly_return = rng.normal(expected_return, volatility)
            current = max(0.0, current * (1 + yearly_return) - annual_withdrawal)
            peak = max(peak, current)
            drawdown = 0.0 if peak == 0 else (current - peak) / peak
            max_drawdowns[simulation_index] = min(max_drawdowns[simulation_index], drawdown)
            paths[simulation_index, year] = current

    final_values = paths[:, -1]
    success_rate = float(np.mean(final_values > 0))
    projected_final_value = float(np.mean(final_values))
    worst_case_value = float(np.percentile(final_values, 5))
    max_drawdown = float(abs(np.percentile(max_drawdowns, 5)))
    expected_annual_income = initial_capital * dividend_yield
    withdrawal_rate = 0.0 if initial_capital == 0 else annual_withdrawal / initial_capital
    income_coverage = 1.0 if target_monthly_income == 0 else annual_to_monthly_income(initial_capital, dividend_yield) / target_monthly_income
    risk_score = int(min(100, max(1, round((volatility * 260) + (max_drawdown * 65) + (withdrawal_rate * 180)))))

    if success_rate >= 0.85 and income_coverage >= 0.9:
        recommendation_summary = "目前假設下，投資組合有較高機率支撐目標現金流，可優先採用核心 ETF 分散投入。"
    elif success_rate >= 0.65:
        recommendation_summary = "目前組合具備可行性，但目標收入或波動仍有壓力，建議分批投入並保留防禦資產。"
    else:
        recommendation_summary = "目前目標現金流偏吃緊，建議降低提領、增加本金或提高防禦型配置後再執行。"

    action_plan = [
        "先以核心 ETF 建立主要部位，再用股息或成長型標的補足現金流與報酬。",
        f"目標年提領率約 {withdrawal_rate * 100:.1f}%，若超過 4% 應定期重算壓力測試。",
        "每季檢查一次成功率、最大回撤與股息覆蓋率，避免只用單日漲跌決策。",
    ]
    if income_coverage < 1:
        action_plan.append("目前預估股息收入低於目標月收入，需依賴賣出本金或調整目標收入。")

    growth = [
        GrowthPoint(
            year=year,
            p5=float(np.percentile(paths[:, year], 5)),
            median=float(np.percentile(paths[:, year], 50)),
            p95=float(np.percentile(paths[:, year], 95)),
        )
        for year in range(years + 1)
    ]

    return SimulationResult(
        averageMonthlyIncome=annual_to_monthly_income(initial_capital, dividend_yield),
        successRate=success_rate,
        projectedFinalValue=projected_final_value,
        worstCaseValue=worst_case_value,
        maxDrawdown=max_drawdown,
        growth=growth,
        assets=assets,
        diagnostics=SimulationDiagnostics(
            expectedAnnualReturn=expected_return,
            expectedDividendYield=dividend_yield,
            expectedAnnualIncome=expected_annual_income,
            withdrawalRate=withdrawal_rate,
            riskScore=risk_score,
            incomeCoverage=income_coverage,
            recommendationSummary=recommendation_summary,
            actionPlan=action_plan,
        ),
        candidates=candidates,
    )
