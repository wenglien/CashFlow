"use client";

import { Bot, CheckCircle2, Clipboard, MessageCircle, RotateCcw, Send, Sparkles, User, X } from "lucide-react";
import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { askMarketAi } from "@/lib/api";
import type { PageContext } from "@/lib/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: "openai" | "groq" | "local";
  model?: string | null;
};

type CashFlowWindow = Window & {
  __cashflowPageState?: Record<string, unknown>;
};

function sourceLabel(source: ChatMessage["source"], model?: string | null) {
  if (source === "groq") return `Groq ${model ?? ""}`.trim();
  if (source === "openai") return `OpenAI ${model ?? ""}`.trim();
  return "本機分析 fallback";
}

function cleanText(text: string | null | undefined) {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function isVisibleElement(element: Element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
}

function fieldLabel(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;
  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label?.textContent) return cleanText(label.textContent);
  }
  const wrappingLabel = element.closest("label");
  if (wrappingLabel?.textContent) {
    return cleanText(wrappingLabel.textContent.replace(element.value, ""));
  }
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.placeholder || element.name || "未命名欄位";
  }
  return element.name || "未命名欄位";
}

function fieldValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  if (element instanceof HTMLSelectElement) {
    return cleanText(element.selectedOptions[0]?.textContent ?? element.value);
  }
  if (element.type === "range") return element.value;
  return element.value || element.placeholder || "";
}

function nearestSectionTitle(element: Element) {
  const section = element.closest("section, article, aside, main, div");
  const heading = section?.querySelector("h1, h2, h3");
  return cleanText(heading?.textContent) || undefined;
}

function collectPageContext(): PageContext {
  const root = document.querySelector("main") ?? document.body;
  const skippedSelectors = [
    "[data-ai-chat]",
    "#mobile-market-ai-chat",
    "[aria-controls='mobile-market-ai-chat']",
    "[aria-label='關閉 AI 問答']"
  ];
  const isUsefulElement = (element: Element) => !skippedSelectors.some((selector) => element.closest(selector)) && isVisibleElement(element);
  const contentElements = Array.from(root.querySelectorAll("h1, h2, h3, p, label, button, input, select, textarea, [data-ai-context]"))
    .filter(isUsefulElement);
  const textParts = contentElements
    .map((element) => {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return `${fieldLabel(element)}：${fieldValue(element)}`;
      }
      if (element instanceof HTMLSelectElement) {
        return `${fieldLabel(element)}：${fieldValue(element)}`;
      }
      return element.textContent ?? "";
    })
    .map(cleanText)
    .filter(Boolean);
  const uniqueText = Array.from(new Set(textParts)).join("\n").slice(0, 4500);
  const headings = Array.from(root.querySelectorAll("h1, h2, h3"))
    .filter(isUsefulElement)
    .map((element) => cleanText(element.textContent))
    .filter(Boolean)
    .slice(0, 24);
  const formFields = Array.from(root.querySelectorAll("input, textarea, select"))
    .filter((element): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
      return (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) && isUsefulElement(element);
    })
    .map((element) => ({
      label: fieldLabel(element),
      value: fieldValue(element),
      type: element instanceof HTMLSelectElement ? "select" : element.type || element.tagName.toLowerCase()
    }))
    .filter((field) => field.value)
    .slice(0, 30);
  const metrics = Array.from(root.querySelectorAll("[data-ai-metric], .shadow-card, .shadow-panel"))
    .filter(isUsefulElement)
    .map((element) => {
      const lines = cleanText(element.textContent).split(" ").filter(Boolean);
      if (lines.length < 2 || lines.length > 28) return null;
      return {
        label: lines.slice(0, Math.max(1, lines.length - 1)).join(" "),
        value: lines[lines.length - 1],
        section: nearestSectionTitle(element) ?? ""
      };
    })
    .filter((item): item is { label: string; value: string; section: string } => Boolean(item))
    .slice(0, 24);
  const sections = Array.from(root.querySelectorAll("section, article, [data-ai-context]"))
    .filter(isUsefulElement)
    .map((element) => {
      const title = cleanText(element.querySelector("h1, h2, h3")?.textContent) || cleanText(element.getAttribute("aria-label")) || "未命名區塊";
      const text = cleanText(element.textContent).slice(0, 900);
      return { title, text };
    })
    .filter((section) => section.text)
    .slice(0, 10);

  return {
    title: document.title,
    url: window.location.href,
    route: window.location.pathname,
    capturedAt: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    visibleText: uniqueText,
    headings,
    formFields,
    metrics,
    sections,
    appState: (window as CashFlowWindow).__cashflowPageState
  };
}

function detectSimulationAction(question: string): { message: string } | null {
  if (!window.location.pathname.startsWith("/simulation")) return null;
  const normalized = question.replace(/\s+/g, "");
  const wantsApply = /套用|設定|改成|切換/.test(normalized);
  if (wantsApply && /保守|穩健/.test(normalized)) {
    window.dispatchEvent(new CustomEvent("cashflow:apply-simulation-preset", { detail: { preset: "conservative" } }));
    return { message: "我已幫你套用「穩健入門」情境。你可以再檢查本金、目標月收入與年限，或直接請我執行模擬。" };
  }
  if (wantsApply && /均衡|平衡/.test(normalized)) {
    window.dispatchEvent(new CustomEvent("cashflow:apply-simulation-preset", { detail: { preset: "balanced" } }));
    return { message: "我已幫你套用「均衡成長」情境。這組設定會用系統模型做壓力測試，再產生 AI 綜合建議。" };
  }
  if (wantsApply && /積極|科技|成長/.test(normalized)) {
    window.dispatchEvent(new CustomEvent("cashflow:apply-simulation-preset", { detail: { preset: "aggressive" } }));
    return { message: "我已幫你套用「科技積極」情境。這個情境波動較高，模擬結果會特別看成功率、最大回撤與風險提醒。" };
  }
  if (/執行模擬|開始模擬|產生.*建議|跑模擬/.test(normalized)) {
    window.dispatchEvent(new CustomEvent("cashflow:run-simulation"));
    return { message: "我已幫你送出模擬。結果出來後，可以再問我「這份結果要注意什麼？」我會依目前頁面內容解讀。" };
  }
  return null;
}

type MarketAiChatMode = "both" | "floating" | "embedded";

export function MarketAiChat({ symbols, mode = "both" }: { symbols: string[]; mode?: MarketAiChatMode }) {
  const initialMessage = useMemo<ChatMessage>(
    () => ({
      id: "intro",
      role: "assistant",
      content: "我會讀取目前頁面上的市場、模擬與篩選資訊，幫你整理重點、比較風險，或套用模擬情境。"
    }),
    []
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    initialMessage
  ]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "done" | "error">("idle");
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const desktopMessagesRef = useRef<HTMLDivElement | null>(null);
  const floatingDesktopMessagesRef = useRef<HTMLDivElement | null>(null);
  const mobileMessagesRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(false);
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant" && message.id !== "intro");
  const showFloatingChat = mode === "both" || mode === "floating";
  const showEmbeddedChat = mode === "both" || mode === "embedded";

  useEffect(() => {
    setPageContext(collectPageContext());
  }, []);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    window.requestAnimationFrame(() => {
      const scrollTarget = isMobileChatOpen ? (mobileMessagesRef.current ?? floatingDesktopMessagesRef.current) : desktopMessagesRef.current;
      scrollTarget?.scrollTo({ top: scrollTarget.scrollHeight, behavior: "smooth" });
    });
  }, [messages, isLoading, error, isMobileChatOpen]);

  useEffect(() => {
    if (!isMobileChatOpen) return;
    window.requestAnimationFrame(() => {
      setPageContext(collectPageContext());
      mobileMessagesRef.current?.scrollTo({ top: mobileMessagesRef.current.scrollHeight });
      floatingDesktopMessagesRef.current?.scrollTo({ top: floatingDesktopMessagesRef.current.scrollHeight });
    });
  }, [isMobileChatOpen]);

  async function ask(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed
    };
    shouldAutoScrollRef.current = true;
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setIsLoading(true);
    setError(null);

    try {
      const localAction = detectSimulationAction(trimmed);
      if (localAction) {
        setMessages((current) => [
          ...current,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: localAction.message,
            source: "local",
            model: null
          }
        ]);
        return;
      }
      const currentPageContext = collectPageContext();
      setPageContext(currentPageContext);
      const response = await askMarketAi(symbols, trimmed, currentPageContext);
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

  function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    ask(question);
  }

  async function copyLatestAnswer() {
    if (!latestAssistant) return;
    try {
      await navigator.clipboard.writeText(latestAssistant.content);
      setCopyState("done");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  function resetChat() {
    shouldAutoScrollRef.current = false;
    setMessages([initialMessage]);
    setError(null);
    setQuestion("");
  }

  function renderChatSurface(scrollRef: typeof desktopMessagesRef, compact = false) {
    const routeLabel = pageContext?.url
      ? new URL(pageContext.url).pathname.replace("/", "") || "首頁"
      : "目前頁面";

    return (
      <>
        <div className={`shrink-0 border-b border-ink/10 bg-white ${compact ? "p-3" : "p-5"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pine text-white shadow-card">
                <Sparkles size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold text-pine">CashFlow AI</p>
                <h2 className={`${compact ? "text-lg" : "text-xl"} mt-1 font-semibold text-ink`}>投資流程助理</h2>
                <p className="mt-1 text-xs leading-5 text-ink/55">正在讀取 {routeLabel} · {symbols.length} 檔標的</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="flex min-h-9 items-center gap-1 rounded-md bg-mist px-3 py-2 text-xs font-semibold text-ink/60 hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                onClick={copyLatestAnswer}
                disabled={!latestAssistant}
              >
                <Clipboard size={13} />
                {copyState === "done" ? "已複製" : copyState === "error" ? "無法複製" : "複製回答"}
              </button>
              <button
                type="button"
                className="flex min-h-9 items-center gap-1 rounded-md bg-mist px-3 py-2 text-xs font-semibold text-ink/60 hover:bg-ink hover:text-white"
                onClick={resetChat}
              >
                <RotateCcw size={13} />
                清除
              </button>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className={`grid gap-3 overflow-y-auto overscroll-contain bg-white ${compact ? "min-h-0 flex-1 p-3" : "max-h-[520px] p-5"}`}>
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" ? (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-pine text-white">
                  <Bot size={16} />
                </span>
              ) : null}
              <div className={`max-w-3xl rounded-lg p-3 text-sm leading-6 shadow-card ${message.role === "user" ? "bg-ink text-white" : "bg-mist text-ink"}`}>
                <p className="whitespace-pre-line">{message.content}</p>
                {message.role === "assistant" && message.source ? (
                  <p className="mt-2 flex items-center gap-1 text-xs text-ink/50">
                    <CheckCircle2 size={12} />
                    {sourceLabel(message.source, message.model)}
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
          {isLoading ? (
            <div className="flex items-center gap-3 text-sm text-ink/55">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-pine text-white">
                <Bot size={16} />
              </span>
              <span className="rounded-lg bg-mist px-3 py-2">AI 正在整理目前頁面...</span>
            </div>
          ) : null}
          {error ? <div className="rounded-md bg-coral/10 p-3 text-sm font-medium text-coral">{error}</div> : null}
        </div>

        <div className={`shrink-0 border-t border-ink/10 bg-white ${compact ? "p-3" : "p-5"}`}>
          <form onSubmit={submit} className="grid gap-2">
            <div className="flex gap-2 rounded-lg border border-ink/15 bg-white p-2 focus-within:border-pine">
              <textarea
                className={`min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 outline-none ${compact ? "text-base" : "text-base sm:text-sm"}`}
                rows={2}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={submitOnEnter}
                placeholder="直接輸入你的問題..."
              />
              <button
                className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-pine text-white hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading || !question.trim()}
                aria-label="送出 AI 問題"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-xs leading-5 text-ink/45">AI 回答僅供教育研究參考。</p>
          </form>
        </div>
      </>
    );
  }

  function renderFloatingTitle() {
    return (
      <>
        <span className="grid h-8 w-8 place-items-center rounded-md bg-white/20 md:bg-white/15">
          <MessageCircle size={17} />
        </span>
        <span className="grid text-left leading-tight">
          <span className="font-semibold">AI 助手</span>
          <span className="hidden text-xs font-medium opacity-80 md:inline">解讀目前頁面</span>
        </span>
      </>
    );
  }

  return (
    <>
      {showFloatingChat ? (
        <button
          type="button"
          className="fixed bottom-4 right-4 z-50 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-pine/20 bg-pine px-3 text-sm font-semibold text-white shadow-panel hover:bg-ink md:bottom-6 md:right-6 md:px-4"
          aria-expanded={isMobileChatOpen}
          aria-controls="mobile-market-ai-chat"
          aria-label="開啟 AI 問答"
          onClick={() => setIsMobileChatOpen((value) => !value)}
        >
          {renderFloatingTitle()}
        </button>
      ) : null}

      {showFloatingChat && isMobileChatOpen ? (
        <div className="fixed inset-0 z-[60]" data-ai-chat>
          <button type="button" className="absolute inset-0 cursor-default bg-ink/20 md:bg-ink/10" aria-label="關閉 AI 問答" onClick={() => setIsMobileChatOpen(false)} />
          <section id="mobile-market-ai-chat" className="absolute inset-x-3 bottom-3 top-16 flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-card md:hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2 font-semibold text-ink">
                <MessageCircle size={18} className="text-pine" />
                AI 問答
              </div>
              <button type="button" className="grid h-10 w-10 place-items-center rounded-md text-slate hover:bg-mist" onClick={() => setIsMobileChatOpen(false)} aria-label="關閉 AI 問答">
                <X size={18} />
              </button>
            </div>
            {renderChatSurface(mobileMessagesRef, true)}
          </section>
          <section className="absolute bottom-24 right-6 hidden h-[min(760px,calc(100vh-8rem))] w-[460px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-card md:flex">
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2 font-semibold text-ink">
                <MessageCircle size={18} className="text-pine" />
                AI 助手
              </div>
              <button type="button" className="grid h-10 w-10 place-items-center rounded-md text-slate hover:bg-mist" onClick={() => setIsMobileChatOpen(false)} aria-label="關閉 AI 助手">
                <X size={18} />
              </button>
            </div>
            {renderChatSurface(floatingDesktopMessagesRef, true)}
          </section>
        </div>
      ) : null}

      {showEmbeddedChat ? (
        <section className="hidden overflow-hidden rounded-lg border border-ink/10 bg-white shadow-panel md:block" data-ai-chat>
          {renderChatSurface(desktopMessagesRef)}
        </section>
      ) : null}
    </>
  );
}
