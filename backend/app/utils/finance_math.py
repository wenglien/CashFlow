def weighted_average(values: list[float], weights: list[float]) -> float:
    total_weight = sum(weights)
    if total_weight <= 0:
        return 0.0
    return sum(value * weight for value, weight in zip(values, weights)) / total_weight


def annual_to_monthly_income(capital: float, dividend_yield: float) -> float:
    return capital * dividend_yield / 12
