"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, CandlestickChart, Filter, LineChart, PieChart, TrendingUp } from "lucide-react";

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

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-pine text-white">
            <CandlestickChart size={18} />
          </span>
          CashFlow
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto">
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
    </header>
  );
}
