import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { GlobalAiChat } from "@/components/GlobalAiChat";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: "CashFlow · 股市深度分析",
  description: "整合基本面、籌碼面與 AI 的台股／美股深度分析平台"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant" className={inter.variable}>
      <body>
        <div className="min-h-screen">
          <AppHeader />
          {children}
          <GlobalAiChat />
        </div>
      </body>
    </html>
  );
}
