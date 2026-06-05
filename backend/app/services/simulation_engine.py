import numpy as np

from app.schemas import (
    AssetAllocation,
    GrowthPoint,
    InvestmentCandidate,
    PortfolioAction,
    SimulationAiInsight,
    SimulationDiagnostics,
    SimulationResult,
)
from app.utils.finance_math import annual_to_monthly_income, weighted_average


def _portfolio_assumptions(assets: list[AssetAllocation]) -> tuple[float, float, float]:
    weights = [asset.allocationPercent / 100 for asset in assets]
    expected_return = weighted_average([asset.expectedReturn for asset in assets], weights)
    dividend_yield = weighted_average([asset.dividendYield for asset in assets], weights)
    variance = sum((weight * asset.volatility) ** 2 for weight, asset in zip(weights, assets))
    return expected_return, float(np.sqrt(variance)), dividend_yield


def _candidate_symbols_for_asset(asset_name: str, candidates: list[InvestmentCandidate]) -> list[str]:
    if "債券" in asset_name or "貨幣" in asset_name:
        matched = [candidate.symbol for candidate in candidates if "債" in candidate.category or candidate.riskLabel == "低"]
    elif "高股息" in asset_name:
        matched = [candidate.symbol for candidate in candidates if "股息" in candidate.category or "高股息" in candidate.name]
    elif "科技" in asset_name or "美國" in asset_name or "龍頭" in asset_name or "成長" in asset_name:
        matched = [candidate.symbol for candidate in candidates if candidate.riskLabel == "高" or "科技" in candidate.category or "AI" in candidate.category]
    else:
        matched = [candidate.symbol for candidate in candidates if "市值" in candidate.category or candidate.riskLabel != "高"]
    return matched[:3]


def _asset_role(asset_name: str) -> str:
    if "現金" in asset_name or "債券" in asset_name or "貨幣" in asset_name:
        return "防守與流動性"
    if "科技" in asset_name or "美國" in asset_name or "龍頭" in asset_name or "成長" in asset_name:
        return "衛星成長"
    return "核心配置"


def _asset_guidance(asset_name: str, withdrawal_rate: float, income_coverage: float, risk_score: int) -> str:
    if "現金" in asset_name:
        return "保留可動用資金，遇到回撤時先用現金緩衝，不急著賣出核心部位。"
    if "債券" in asset_name or "貨幣" in asset_name:
        return "放在低波動工具，降低整體回撤；若風險分數偏高，可優先從衛星部位挪一部分到這裡。"
    if "高股息" in asset_name:
        if income_coverage < 1:
            return "用來補強每月現金流，但不要只追高配息；仍要搭配市值型 ETF 分散來源。"
        return "作為收入來源，定期檢查配息是否穩定，並避免單一 ETF 比重過高。"
    if "科技" in asset_name or "美國" in asset_name or "龍頭" in asset_name or "成長" in asset_name:
        if risk_score >= 70 or withdrawal_rate > 0.07:
            return "這層波動較大，建議先壓低比重，等目標提領率下降或成功率改善後再增加。"
        return "用小比例追求成長，單一個股或題材不要超過整體組合的衛星配置。"
    return "作為長期核心，適合分批投入並定期再平衡，避免短線行情改變整體策略。"


def _build_portfolio_blueprint(
    *,
    initial_capital: float,
    assets: list[AssetAllocation],
    candidates: list[InvestmentCandidate],
    withdrawal_rate: float,
    income_coverage: float,
    risk_score: int,
) -> list[PortfolioAction]:
    return [
        PortfolioAction(
            title=asset.assetName,
            role=_asset_role(asset.assetName),
            allocationPercent=asset.allocationPercent,
            amount=round(initial_capital * asset.allocationPercent / 100),
            guidance=_asset_guidance(asset.assetName, withdrawal_rate, income_coverage, risk_score),
            symbols=_candidate_symbols_for_asset(asset.assetName, candidates),
        )
        for asset in assets
    ]


def _build_ai_insight(
    *,
    success_rate: float,
    income_coverage: float,
    withdrawal_rate: float,
    max_drawdown: float,
    risk_score: int,
    candidates: list[InvestmentCandidate],
) -> SimulationAiInsight:
    if success_rate >= 0.85 and income_coverage >= 0.9 and risk_score <= 65:
        signal = "可執行"
        headline = "系統模擬與 AI 解讀皆支持目前方案可作為基準配置"
        summary = "量化模型顯示成功率與股息覆蓋率相對健康，AI 建議先用核心 ETF 建立穩定部位，再用小比例衛星標的補強成長。"
    elif success_rate >= 0.65 and withdrawal_rate <= 0.07:
        signal = "需調整"
        headline = "方案具備可行性，但 AI 建議降低現金流壓力或增加防守資產"
        summary = "系統模擬仍有一定成功機率，但提領率、回撤或股息覆蓋有壓力。AI 建議先調整目標收入、分批投入，並提高防禦資產比重。"
    else:
        signal = "高壓力"
        headline = "目前假設壓力偏高，AI 建議先重設目標再進場"
        summary = "量化結果顯示本金、目標收入與風險承受度之間不夠匹配。AI 建議優先降低月收入目標、增加本金或延長年限，再重新模擬。"

    core_candidates = [candidate for candidate in candidates if candidate.riskLabel != "高"][:3]
    satellite_candidates = [candidate for candidate in candidates if candidate.riskLabel == "高"][:2]
    allocation_guidance = [
        "先以系統建議的核心 ETF 或中低風險標的建立主要部位，避免一開始集中在單一題材。",
        f"目前股息覆蓋率約 {income_coverage:.2f} 倍；若低於 1 倍，代表收入目標仍需依賴資本利得或賣出本金補足。",
    ]
    if core_candidates:
        allocation_guidance.append("核心優先觀察：" + "、".join(f"{item.symbol} {item.name}" for item in core_candidates))
    if satellite_candidates:
        allocation_guidance.append("衛星部位可小比例配置：" + "、".join(f"{item.symbol} {item.name}" for item in satellite_candidates))

    risk_warnings = [
        f"最大回撤壓力約 {max_drawdown * 100:.0f}%，若無法承受此波動，應降低風險等級。",
        f"目標年提領率約 {withdrawal_rate * 100:.1f}%，高於 4% 時需定期重新壓力測試。",
    ]
    if risk_score >= 70:
        risk_warnings.append("組合風險分數偏高，AI 建議提高現金、債券或高股息分散配置。")

    return SimulationAiInsight(
        headline=headline,
        systemSignal=signal,
        aiSummary=summary,
        allocationGuidance=allocation_guidance,
        riskWarnings=risk_warnings,
    )


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

    ai_insight = _build_ai_insight(
        success_rate=success_rate,
        income_coverage=income_coverage,
        withdrawal_rate=withdrawal_rate,
        max_drawdown=max_drawdown,
        risk_score=risk_score,
        candidates=candidates,
    )
    portfolio_blueprint = _build_portfolio_blueprint(
        initial_capital=initial_capital,
        assets=assets,
        candidates=candidates,
        withdrawal_rate=withdrawal_rate,
        income_coverage=income_coverage,
        risk_score=risk_score,
    )

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
            portfolioBlueprint=portfolio_blueprint,
        ),
        aiInsight=ai_insight,
        candidates=candidates,
    )
