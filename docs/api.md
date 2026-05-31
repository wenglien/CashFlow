# API

All production endpoints expect `Authorization: Bearer <firebase-id-token>`.

For local development, `ALLOW_DEV_AUTH=true` allows requests without a token or with `Bearer dev-token`.

## POST `/api/portfolio`

Creates a generated portfolio allocation.

## GET `/api/portfolio/{id}`

Fetches a portfolio. The starter implementation returns a sample portfolio until Firestore persistence is connected.

## GET `/api/assets/{risk_level}`

Returns the asset template for `conservative`, `balanced`, or `aggressive`.

## POST `/api/simulation/run`

Runs Monte Carlo simulation.

```json
{
  "portfolio": {
    "totalCapital": 100000,
    "targetMonthlyIncome": 400,
    "investmentYears": 20,
    "riskLevel": "balanced",
    "currency": "USD"
  },
  "simulations": 3000,
  "seed": 42
}
```

## GET `/api/market/snapshot?symbols=SPY,QQQ,NVDA`

Returns a professional market snapshot for the requested watchlist. If `FINNHUB_API_KEY` is configured, the backend requests live quote data. Without a key, it returns stable demo data so the product remains usable in development.
