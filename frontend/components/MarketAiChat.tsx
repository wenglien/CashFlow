"use client";

import { Bot, Send, User } from "lucide-react";
import { FormEvent, useState } from "react";
import { askMarketAi } from "@/lib/api";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: "openai" | "groq" | "local";
  model?: string | null;
};

const suggestions = [
  "這幾檔目前誰比較強勢？",
  "請比較股息率與風險",
  "如果我是保守型投資人，要注意什麼？"
];

function sourceLabel(source: ChatMessage["source"], model?: string | null) {
  if (source === "groq") return `Groq ${model ?? ""}`.trim();
  if (source === "openai") return `OpenAI ${model ?? ""}`.trim();
  return "本機分析 fallback";
}

export function MarketAiChat({ symbols }: { symbols: string[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content: "你可以針對目前選取的標的詢問漲跌、風險、股息率、成交量或配置方向。我會以教育用途的市場分析方式回答。"
    }
  ]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed
    };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await askMarketAi(symbols, trimmed);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.answer,
          source: response.source,
          model: response.model
        }
      ]);
    } catch {
      setError("AI 分析暫時無法取得，請稍後再試。");
    } finally {
      setIsLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white shadow-panel">
      <div className="border-b border-ink/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-pine">AI 對話分析</p>
            <h2 className="mt-1 text-xl font-semibold">針對所選股市提問</h2>
          </div>
          <div className="rounded-md bg-mist px-3 py-2 text-xs font-semibold text-ink/60">目前 {symbols.length} 檔標的</div>
        </div>
      </div>

      <div className="grid max-h-[520px] gap-3 overflow-y-auto p-5">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" ? (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-pine text-white">
                <Bot size={16} />
              </span>
            ) : null}
            <div className={`max-w-3xl rounded-lg p-3 text-sm leading-6 ${message.role === "user" ? "bg-ink text-white" : "bg-mist text-ink"}`}>
              <p className="whitespace-pre-line">{message.content}</p>
              {message.role === "assistant" && message.source ? (
                <p className="mt-2 text-xs text-ink/50">
                  來源：{sourceLabel(message.source, message.model)}
                </p>
              ) : null}
            </div>
            {message.role === "user" ? (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-ink text-white">
                <User size={16} />
              </span>
            ) : null}
          </div>
        ))}
        {isLoading ? <div className="text-sm text-ink/55">AI 正在分析所選標的...</div> : null}
        {error ? <div className="rounded-md bg-coral/10 p-3 text-sm font-medium text-coral">{error}</div> : null}
      </div>

      <div className="border-t border-ink/10 p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-ink/65 hover:bg-pine hover:text-white"
              onClick={() => ask(item)}
              disabled={isLoading}
            >
              {item}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-md border border-ink/15 px-3 py-3 text-sm outline-none focus:border-pine"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="輸入你的問題，例如：這幾檔哪個風險比較高？"
          />
          <button
            className="flex items-center justify-center gap-2 rounded-md bg-pine px-4 py-3 text-sm font-semibold text-white hover:bg-ink disabled:opacity-60"
            disabled={isLoading || !question.trim()}
          >
            <Send size={16} />
            送出
          </button>
        </form>
      </div>
    </section>
  );
}
