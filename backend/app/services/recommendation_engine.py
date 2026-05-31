from app.schemas import SimulationResult


def summarize_result(result: SimulationResult) -> str:
    if result.successRate >= 0.85:
        return "在目前假設下，這個計畫具備不錯的韌性。"
    if result.successRate >= 0.65:
        return "這個計畫可行，但建議重新檢查收入目標或風險曝險。"
    return "這個計畫偏脆弱，可考慮降低提領、增加本金或拉長投資期間。"
