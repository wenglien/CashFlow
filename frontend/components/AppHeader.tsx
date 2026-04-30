"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CircleDollarSign, LayoutDashboard, PieChart } from "lucide-react";

const navItems = [
  { href: "/", label: "首頁", icon: CircleDollarSign },
  { href: "/dashboard", label: "儀表板", icon: LayoutDashboard },
  { href: "/portfolio", label: "投資組合", icon: PieChart },
  { href: "/simulation", label: "模擬分析", icon: BarChart3 }
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-normal text-ink">
          CashFlow
        </Link>
        <div className="flex flex-wrap justify-end gap-1">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                  isActive ? "bg-pine text-white" : "text-ink/65 hover:bg-mist hover:text-ink"
                }`}
              >
                <item.icon size={16} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
