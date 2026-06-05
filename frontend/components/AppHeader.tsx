"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, BarChart3, CandlestickChart, ChevronDown, Filter, LineChart, PieChart, TrendingUp, X } from "lucide-react";

const navItems = [
  { href: "/stock", label: "個股分析", icon: LineChart, match: "/stock" },
  { href: "/screener", label: "選股", icon: Filter, match: "/screener" },
  { href: "/backtest", label: "回測", icon: Activity, match: "/backtest" },
  { href: "/market", label: "市場", icon: TrendingUp, match: "/market" },
  { href: "/portfolio", label: "投資組合", icon: PieChart, match: "/portfolio" },
  { href: "/simulation", label: "模擬", icon: BarChart3, match: "/simulation" }
];

export function AppHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const currentItem = navItems.find((item) => pathname === item.href || pathname.startsWith(item.match)) ?? navItems[0];
  const CurrentIcon = currentItem.icon;

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-pine text-white">
            <CandlestickChart size={18} />
          </span>
          <span className="max-[374px]:hidden">CashFlow</span>
        </Link>
        <button
          type="button"
          className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-panel md:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMenuOpen((value) => !value)}
        >
          <CurrentIcon size={16} className="shrink-0 text-pine" />
          <span className="max-w-24 truncate">{currentItem.label}</span>
          {isMenuOpen ? <X size={16} className="shrink-0 text-slate" /> : <ChevronDown size={16} className="shrink-0 text-slate" />}
        </button>
        <div className="hidden min-w-0 flex-1 items-center justify-end gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                  isActive ? "bg-pine text-white shadow-card" : "text-slate hover:bg-mist hover:text-ink"
                }`}
              >
                <item.icon size={16} />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      {isMenuOpen ? (
        <div className="fixed inset-x-0 top-[57px] z-50 px-4 pt-2 md:hidden">
          <button
            type="button"
            className="fixed inset-0 top-[57px] -z-10 cursor-default bg-ink/10"
            aria-label="關閉選單"
            onClick={() => setIsMenuOpen(false)}
          />
          <div id="mobile-navigation" className="ml-auto grid w-full max-w-[20rem] gap-2 rounded-lg border border-line bg-surface p-2 shadow-card">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.match);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center justify-between rounded-lg px-3 py-3 text-sm font-semibold transition ${
                    isActive ? "bg-pine text-white shadow-card" : "bg-white text-ink/70 shadow-panel hover:bg-mist hover:text-ink"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <item.icon size={18} />
                    {item.label}
                  </span>
                  {isActive ? <span className="text-xs opacity-80">目前</span> : null}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
