import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201d",
        mist: "#edf2ef",
        pine: "#1f6f58",
        mint: "#9ad8bf",
        coral: "#ec7f67",
        gold: "#d4a73f"
      },
      boxShadow: {
        panel: "0 12px 36px rgba(23, 32, 29, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
