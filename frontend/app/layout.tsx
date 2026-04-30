import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "CashFlow",
  description: "個人投資現金流模擬與市場分析工具"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="min-h-screen">
          <AppHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
