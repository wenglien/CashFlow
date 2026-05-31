# Simulation

The simulation engine models annual portfolio returns with a normal distribution derived from weighted asset assumptions.

Metrics:

- Success rate: share of simulations with ending value above zero
- Projected final value: average ending value
- Worst case value: fifth percentile ending value
- Max drawdown: fifth percentile of maximum path drawdowns
- Growth path: P5, median, and P95 values by year

The first version uses a simplified volatility model without asset correlations. That keeps the behavior transparent for beginner investors while leaving room for historical data and covariance-based modeling later.
