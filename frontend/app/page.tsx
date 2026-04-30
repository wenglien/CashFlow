import Link from "next/link";
import { ArrowRight, BarChart3, PieChart, ShieldCheck } from "lucide-react";

const metrics = [
  { label: "收益模型", value: "每月" },
  { label: "模擬路徑", value: "3,000" },
  { label: "風險配置", value: "3" }
];

export default function Home() {
  return (
    <main>
      <section className="bg-white">
        <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pine">新手友善的專業投資分析</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal text-ink sm:text-6xl">
              CashFlow
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/70">
              建立投資組合、估算被動現金流，並透過數千條市場路徑壓力測試資產續航力。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/simulation" className="flex items-center gap-2 rounded-md bg-pine px-5 py-3 font-semibold text-white hover:bg-ink">
                開始模擬
                <ArrowRight size={18} />
              </Link>
              <Link href="/dashboard" className="rounded-md border border-ink/15 px-5 py-3 font-semibold hover:bg-mist">
                查看儀表板
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-ink/10 bg-mist p-4 shadow-panel">
            <div className="grid gap-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="flex items-center justify-between rounded-md bg-white px-4 py-4">
                  <span className="text-sm font-medium text-ink/60">{metric.label}</span>
                  <span className="text-xl font-semibold">{metric.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[PieChart, BarChart3, ShieldCheck].map((Icon, index) => (
                <div key={index} className="grid aspect-square place-items-center rounded-md bg-white text-pine">
                  <Icon size={30} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
