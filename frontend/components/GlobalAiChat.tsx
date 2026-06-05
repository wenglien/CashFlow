"use client";

import { MarketAiChat } from "@/components/MarketAiChat";
import { DEFAULT_SELECTED_SYMBOLS } from "@/lib/marketOptions";

export function GlobalAiChat() {
  return <MarketAiChat symbols={DEFAULT_SELECTED_SYMBOLS} mode="floating" />;
}
