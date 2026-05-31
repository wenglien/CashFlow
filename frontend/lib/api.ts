import type {
  BacktestRequestInput,
  BacktestResult,
  ComprehensiveAnalysis,
  FundamentalAnalysis,
  MarketChatResponse,
  MarketSnapshot,
  PortfolioInput,
  ScreenerRequestInput,
  ScreenerResult,
  SimulationResult
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function requestJson<T>(url: string, init?: RequestInit, timeoutMs = 15000): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Request failed with ${response.status}`);
  }

  return response.json();
}

export async function runSimulation(portfolio: PortfolioInput): Promise<SimulationResult> {
  return requestJson<SimulationResult>(`${API_URL}/api/simulation/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer dev-token"
    },
    body: JSON.stringify({ portfolio, simulations: 3000, seed: 42 })
  });
}

export async function getMarketSnapshot(symbols: string[]): Promise<MarketSnapshot> {
  const params = new URLSearchParams({ symbols: symbols.join(",") });
  return requestJson<MarketSnapshot>(`${API_URL}/api/market/snapshot?${params.toString()}`, {
    headers: {
      Authorization: "Bearer dev-token"
    },
    cache: "no-store"
  });
}

export async function getFundamental(symbol: string): Promise<FundamentalAnalysis> {
  return requestJson<FundamentalAnalysis>(
    `${API_URL}/api/fundamental/${encodeURIComponent(symbol.trim())}`,
    {
      headers: {
        Authorization: "Bearer dev-token"
      },
      cache: "no-store"
    }
  );
}

export async function getComprehensiveAnalysis(symbol: string): Promise<ComprehensiveAnalysis> {
  return requestJson<ComprehensiveAnalysis>(
    `${API_URL}/api/analysis/${encodeURIComponent(symbol.trim())}`,
    {
      headers: {
        Authorization: "Bearer dev-token"
      },
      cache: "no-store"
    }
  );
}

export async function runBacktest(input: BacktestRequestInput): Promise<BacktestResult> {
  return requestJson<BacktestResult>(
    `${API_URL}/api/quant/backtest`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer dev-token"
      },
      body: JSON.stringify(input)
    },
    30000
  );
}

export async function runScreener(input: ScreenerRequestInput): Promise<ScreenerResult> {
  return requestJson<ScreenerResult>(
    `${API_URL}/api/quant/screener`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer dev-token"
      },
      body: JSON.stringify(input)
    },
    60000
  );
}

export async function askMarketAi(symbols: string[], question: string): Promise<MarketChatResponse> {
  return requestJson<MarketChatResponse>(`${API_URL}/api/ai/market-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer dev-token"
    },
    body: JSON.stringify({ symbols, question })
  });
}
