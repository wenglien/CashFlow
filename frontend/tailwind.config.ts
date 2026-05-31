import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 文字與中性層次
        ink: "#13201b",
        slate: "#5a6b63",
        // 背景與表面層
        canvas: "#eef3f0",
        surface: "#ffffff",
        mist: "#e9f1ec",
        line: "#dde7e1",
        // 品牌綠(提升對比,AA on white)
        pine: "#157a5b",
        "pine-dark": "#0f5a43",
        "pine-soft": "#e3f2ea",
        mint: "#7fd3b2",
        // 語意色
        coral: "#e0664c",
        "coral-soft": "#fbe9e4",
        gold: "#cf9b32",
        "gold-soft": "#f8efd6",
        sky: "#2f80c4",
        "sky-soft": "#e3eff7"
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "PingFang TC",
          "Noto Sans TC",
          "Microsoft JhengHei",
          "system-ui",
          "sans-serif"
        ]
      },
      borderRadius: {
        lg: "0.7rem",
        xl: "0.95rem",
        "2xl": "1.25rem"
      },
      boxShadow: {
        card: "0 1px 2px rgba(19, 32, 27, 0.04), 0 6px 20px rgba(19, 32, 27, 0.05)",
        panel: "0 2px 8px rgba(19, 32, 27, 0.05), 0 18px 44px rgba(19, 32, 27, 0.08)",
        pop: "0 8px 30px rgba(19, 32, 27, 0.14)",
        focus: "0 0 0 3px rgba(21, 122, 91, 0.18)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
