from app.schemas import AssetAllocation, InvestmentCandidate, RiskLevel


PORTFOLIO_TEMPLATES: dict[RiskLevel, list[AssetAllocation]] = {
    "conservative": [
        AssetAllocation(assetName="台股高股息 ETF", allocationPercent=40, expectedReturn=0.055, dividendYield=0.05, volatility=0.12),
        AssetAllocation(assetName="台股市值型 ETF", allocationPercent=25, expectedReturn=0.07, dividendYield=0.02, volatility=0.16),
        AssetAllocation(assetName="台幣債券／貨幣基金", allocationPercent=25, expectedReturn=0.025, dividendYield=0.02, volatility=0.04),
        AssetAllocation(assetName="現金", allocationPercent=10, expectedReturn=0.012, dividendYield=0.008, volatility=0.01),
    ],
    "balanced": [
        AssetAllocation(assetName="台股市值型 ETF", allocationPercent=30, expectedReturn=0.075, dividendYield=0.02, volatility=0.17),
        AssetAllocation(assetName="台股高股息 ETF", allocationPercent=30, expectedReturn=0.06, dividendYield=0.052, volatility=0.13),
        AssetAllocation(assetName="台股科技龍頭", allocationPercent=10, expectedReturn=0.09, dividendYield=0.018, volatility=0.22),
        AssetAllocation(assetName="美國科技股衛星", allocationPercent=10, expectedReturn=0.1, dividendYield=0.004, volatility=0.28),
        AssetAllocation(assetName="台幣債券／貨幣基金", allocationPercent=10, expectedReturn=0.025, dividendYield=0.02, volatility=0.04),
        AssetAllocation(assetName="現金", allocationPercent=10, expectedReturn=0.012, dividendYield=0.008, volatility=0.01),
    ],
    "aggressive": [
        AssetAllocation(assetName="台股科技成長 ETF", allocationPercent=30, expectedReturn=0.095, dividendYield=0.018, volatility=0.24),
        AssetAllocation(assetName="台股市值型 ETF", allocationPercent=25, expectedReturn=0.075, dividendYield=0.02, volatility=0.17),
        AssetAllocation(assetName="美國科技股衛星", allocationPercent=20, expectedReturn=0.11, dividendYield=0.004, volatility=0.3),
        AssetAllocation(assetName="台股高股息 ETF", allocationPercent=15, expectedReturn=0.06, dividendYield=0.052, volatility=0.13),
        AssetAllocation(assetName="台幣債券／貨幣基金", allocationPercent=10, expectedReturn=0.025, dividendYield=0.02, volatility=0.04),
    ],
}


def generate_portfolio(risk_level: RiskLevel) -> list[AssetAllocation]:
    return PORTFOLIO_TEMPLATES[risk_level]


def _generic_candidate(symbol: str) -> InvestmentCandidate:
    upper = symbol.upper()
    is_taiwan = upper.endswith(".TW")
    is_etf = any(token in upper for token in ["00", "ETF", "SPY", "QQQ", "VOO", "VTI", "SCHD", "VYM", "TLT", "BND", "AGG"])
    return InvestmentCandidate(
        symbol=upper,
        name=f"{upper} 自選標的",
        category="自選觀察",
        allocationPercent=5,
        expectedAnnualReturn=0.065 if is_taiwan else 0.075,
        dividendYield=0.025 if is_etf else 0.01,
        volatility=0.16 if is_etf else 0.24,
        riskLabel="中" if is_etf else "高",
        rationale="此標的來自你在市場清單中的選擇，系統先以自選觀察部位納入 AI 綜合建議；實際配置仍需搭配基本面、波動與現金流壓力檢查。",
    )


def generate_candidates(risk_level: RiskLevel, market_symbols: list[str] | None = None) -> list[InvestmentCandidate]:
    candidate_templates: dict[RiskLevel, list[InvestmentCandidate]] = {
        "conservative": [
            InvestmentCandidate(
                symbol="0056.TW",
                name="元大台灣高股息 ETF",
                category="高股息核心",
                allocationPercent=35,
                expectedAnnualReturn=0.055,
                dividendYield=0.045,
                volatility=0.12,
                riskLabel="中",
                rationale="以台股股息現金流為主要來源，適合保守型投資人建立穩定收益部位。",
            ),
            InvestmentCandidate(
                symbol="00878.TW",
                name="國泰永續高股息 ETF",
                category="高股息分散",
                allocationPercent=25,
                expectedAnnualReturn=0.058,
                dividendYield=0.052,
                volatility=0.13,
                riskLabel="中",
                rationale="提供另一組高股息篩選邏輯，避免單一高股息 ETF 過度集中。",
            ),
            InvestmentCandidate(
                symbol="0050.TW",
                name="元大台灣卓越50 ETF",
                category="市值型核心",
                allocationPercent=20,
                expectedAnnualReturn=0.07,
                dividendYield=0.018,
                volatility=0.16,
                riskLabel="中",
                rationale="補足台股大型權值股成長曝險，讓組合不只依賴配息。",
            ),
            InvestmentCandidate(
                symbol="00679B.TW",
                name="元大美債20年 ETF",
                category="債券防守",
                allocationPercent=20,
                expectedAnnualReturn=0.03,
                dividendYield=0.035,
                volatility=0.08,
                riskLabel="低",
                rationale="用台股掛牌債券 ETF 補足防守資產，降低組合波動並保留配息來源。",
            ),
        ],
        "balanced": [
            InvestmentCandidate(
                symbol="0050.TW",
                name="元大台灣卓越50 ETF",
                category="市值型核心",
                allocationPercent=35,
                expectedAnnualReturn=0.075,
                dividendYield=0.018,
                volatility=0.17,
                riskLabel="中",
                rationale="作為台股核心成長來源，追蹤大型權值股整體表現。",
            ),
            InvestmentCandidate(
                symbol="00878.TW",
                name="國泰永續高股息 ETF",
                category="股息現金流",
                allocationPercent=25,
                expectedAnnualReturn=0.058,
                dividendYield=0.052,
                volatility=0.13,
                riskLabel="中",
                rationale="提升台幣現金流，並用高股息成分分散市值型 ETF 的波動。",
            ),
            InvestmentCandidate(
                symbol="006208.TW",
                name="富邦台灣50 ETF",
                category="市值型替代",
                allocationPercent=12,
                expectedAnnualReturn=0.073,
                dividendYield=0.019,
                volatility=0.17,
                riskLabel="中",
                rationale="與 0050 同屬台股大型股曝險，可作為核心部位的替代或分散配置。",
            ),
            InvestmentCandidate(
                symbol="2330.TW",
                name="台積電",
                category="科技龍頭",
                allocationPercent=10,
                expectedAnnualReturn=0.09,
                dividendYield=0.012,
                volatility=0.22,
                riskLabel="高",
                rationale="台股科技權值核心，但屬單一個股曝險，適合小比例作為衛星部位。",
            ),
            InvestmentCandidate(
                symbol="NVDA",
                name="NVIDIA Corporation",
                category="美國 AI 晶片衛星",
                allocationPercent=8,
                expectedAnnualReturn=0.12,
                dividendYield=0.0,
                volatility=0.34,
                riskLabel="高",
                rationale="加入美國 AI 與加速運算龍頭曝險，但波動較大，適合小比例衛星配置。",
            ),
            InvestmentCandidate(
                symbol="00929.TW",
                name="復華台灣科技優息 ETF",
                category="科技優息衛星",
                allocationPercent=10,
                expectedAnnualReturn=0.068,
                dividendYield=0.06,
                volatility=0.16,
                riskLabel="高",
                rationale="增加科技與配息題材，但需控制比重，避免追逐高配息造成波動放大。",
            ),
        ],
        "aggressive": [
            InvestmentCandidate(
                symbol="00733.TW",
                name="富邦臺灣中小 ETF",
                category="台股中小成長",
                allocationPercent=20,
                expectedAnnualReturn=0.095,
                dividendYield=0.012,
                volatility=0.24,
                riskLabel="高",
                rationale="提高台股中小型成長曝險，但短期波動與回撤會明顯放大。",
            ),
            InvestmentCandidate(
                symbol="0050.TW",
                name="元大台灣卓越50 ETF",
                category="市值型核心",
                allocationPercent=15,
                expectedAnnualReturn=0.075,
                dividendYield=0.018,
                volatility=0.17,
                riskLabel="中",
                rationale="降低中小型與科技題材集中度，保留台股大型權值核心。",
            ),
            InvestmentCandidate(
                symbol="00929.TW",
                name="復華台灣科技優息 ETF",
                category="科技優息",
                allocationPercent=15,
                expectedAnnualReturn=0.068,
                dividendYield=0.06,
                volatility=0.16,
                riskLabel="高",
                rationale="補足台股科技與配息題材，但仍應視為衛星部位而非全部核心。",
            ),
            InvestmentCandidate(
                symbol="2454.TW",
                name="聯發科",
                category="IC 設計龍頭",
                allocationPercent=10,
                expectedAnnualReturn=0.095,
                dividendYield=0.06,
                volatility=0.26,
                riskLabel="高",
                rationale="提供台股科技股中較高的成長與配息特性，但個股波動需要嚴格控管比重。",
            ),
            InvestmentCandidate(
                symbol="2308.TW",
                name="台達電",
                category="電源／AI 基礎建設",
                allocationPercent=10,
                expectedAnnualReturn=0.09,
                dividendYield=0.026,
                volatility=0.24,
                riskLabel="高",
                rationale="受惠電源、散熱與資料中心題材，適合作為積極型科技衛星部位。",
            ),
            InvestmentCandidate(
                symbol="NVDA",
                name="NVIDIA Corporation",
                category="美國 AI 晶片",
                allocationPercent=10,
                expectedAnnualReturn=0.12,
                dividendYield=0.0,
                volatility=0.34,
                riskLabel="高",
                rationale="增加美國 AI 半導體龍頭曝險，適合積極型投資人作為高波動衛星部位。",
            ),
            InvestmentCandidate(
                symbol="MSFT",
                name="Microsoft Corporation",
                category="美國雲端／AI",
                allocationPercent=10,
                expectedAnnualReturn=0.09,
                dividendYield=0.008,
                volatility=0.22,
                riskLabel="高",
                rationale="提供雲端、企業軟體與 AI 平台曝險，波動低於部分高成長科技股。",
            ),
            InvestmentCandidate(
                symbol="00878.TW",
                name="國泰永續高股息 ETF",
                category="高股息防守",
                allocationPercent=10,
                expectedAnnualReturn=0.058,
                dividendYield=0.052,
                volatility=0.13,
                riskLabel="中",
                rationale="在積極配置中保留一部分台幣股息收入與防守性。",
            ),
        ],
    }
    base_candidates = candidate_templates[risk_level]
    if not market_symbols:
        return base_candidates

    all_candidates = {
        candidate.symbol.upper(): candidate
        for candidates in candidate_templates.values()
        for candidate in candidates
    }
    selected_symbols = []
    for symbol in market_symbols:
        upper = symbol.strip().upper()
        if upper and upper not in selected_symbols:
            selected_symbols.append(upper)

    selected_candidates = [all_candidates.get(symbol) or _generic_candidate(symbol) for symbol in selected_symbols]
    selected_set = {candidate.symbol.upper() for candidate in selected_candidates}
    remaining = [candidate for candidate in base_candidates if candidate.symbol.upper() not in selected_set]
    return selected_candidates + remaining
