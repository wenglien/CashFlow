import type { MarketChatResponse, MarketSnapshot, PortfolioInput, SimulationResult } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15000)
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
