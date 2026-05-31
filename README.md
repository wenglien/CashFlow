# CashFlow

CashFlow is a full-stack investment cash flow simulator and market analysis dashboard built for beginner investors who want a clearer way to understand portfolio income, sustainability, risk, and market conditions.

The app combines Monte Carlo simulation, portfolio allocation templates, 3D data visualization, real-time-style market snapshots, and AI-assisted market Q&A.

> This project is for education and product demonstration only. It is not financial advice or a trading recommendation.

## Features

- Portfolio cash flow simulation in NTD
- Monte Carlo sustainability testing with 3,000 default simulation paths
- Risk-level portfolio templates: conservative, balanced, aggressive
- Investment candidate recommendations with expected return, dividend yield, volatility, and rationale
- Taiwan-focused ETF and technology stock watchlists
- US technology stock support, including AAPL, MSFT, NVDA, TSLA, GOOGL, AMZN, META, and AVGO
- Market analysis page with price, daily change, volume pressure, range position, 30-day trend, and signal filters
- Three.js 3D visualizations for market maps, portfolio allocation, and cash flow views
- AI chat for selected market symbols using OpenAI, Groq, or local fallback analysis
- FastAPI backend with development auth fallback
- Firebase-ready authentication and Firestore integration points

## Tech Stack

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Recharts
- Three.js
- Lucide React

### Backend

- Python
- FastAPI
- Pydantic
- NumPy
- Pandas
- Firebase Admin SDK

### Optional Integrations

- Firebase Authentication
- Firebase Firestore
- Finnhub market data
- OpenAI API
- Groq API

## Project Structure

```txt
cashflow/
├── frontend/
│   ├── app/                  # Next.js pages and layout
│   ├── components/           # UI, charts, 3D scenes, market dashboard
│   └── lib/                  # API client, types, market watchlists
├── backend/
│   ├── app/
│   │   ├── routes/           # FastAPI routes
│   │   ├── services/         # Portfolio, simulation, market, AI logic
│   │   ├── utils/            # Shared helpers
│   │   ├── config.py
│   │   ├── firebase_admin.py
│   │   └── schemas.py
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── docs/
│   ├── api.md
│   ├── architecture.md
│   └── simulation.md
├── .env.example
├── .gitignore
└── README.md
```


## Simulation Model

The simulation engine estimates portfolio paths using weighted expected return, dividend yield, and volatility assumptions from the selected risk profile.

Current metrics include:

- Average monthly income
- Success rate
- Projected final value
- Worst-case value
- Maximum drawdown
- P5, median, and P95 growth paths
- Expected annual return
- Expected dividend yield
- Income coverage
- Risk score

The current model intentionally stays transparent for beginner investors. It does not yet include tax modeling, asset correlation, order-level trading, or personalized suitability analysis.

## Market Watchlists

The default watchlist focuses on Taiwan and US technology exposure.

Examples:

- Taiwan ETFs: `0050.TW`, `0056.TW`, `006208.TW`, `00878.TW`, `00929.TW`
- Taiwan technology stocks: `2330.TW`, `2317.TW`, `2454.TW`, `2308.TW`, `2382.TW`
- US technology stocks: `AAPL`, `MSFT`, `NVDA`, `TSLA`, `GOOGL`, `AMZN`, `META`, `AVGO`
- US ETFs and factors: `SPY`, `QQQ`, `VTI`, `SCHD`, `TLT`, `SOXX`, `SMH`

## Roadmap

- Firestore persistence for portfolios and simulation history
- User account dashboard with saved scenarios
- Historical backtesting
- Asset correlation and covariance-based simulation
- Tax and fee assumptions
- Multi-currency conversion
- More market data providers
- Exportable reports
- Mobile-first portfolio monitoring


## License

Add your preferred license before publishing, for example MIT, Apache-2.0, or a private license.
