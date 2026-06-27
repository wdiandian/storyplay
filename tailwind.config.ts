import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sp: {
          bg: "var(--sp-bg)",
          surface: "var(--sp-surface)",
          muted: "var(--sp-surface-muted)",
          border: "var(--sp-border)",
          text: "var(--sp-text)",
          subdued: "var(--sp-text-muted)",
          accent: "var(--sp-accent)",
          accentSoft: "var(--sp-accent-soft)",
          story: "var(--sp-story)",
          play: "var(--sp-play)",
          focus: "var(--sp-focus)",
        },
        cream: {
          50: "#fffaf0",
          100: "#faf5e8",
          200: "#f5f0e0",
          300: "#ebe6d6",
        },
        clay: {
          400: "#9a9a9a",
          500: "#6a6a6a",
          600: "#3a3a3a",
          700: "#1f1f1f",
          900: "#0a0a0a",
        },
        ember: {
          400: "#ff6b5a",
          500: "#ff4d8b",
        },
        story: {
          teal: "#1a3a3a",
          lavender: "#b8a4ed",
          peach: "#ffb084",
          ochre: "#e8b94a",
          mint: "#a4d4c5",
        },
      },
      fontFamily: {
        serif: [
          "var(--font-serif)",
          '"Noto Serif CJK SC"',
          '"Source Han Serif SC"',
          '"Songti SC"',
          "STSong",
          "ui-serif",
          "serif",
        ],
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: {
        widest: "0.32em",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "slow-pulse": "slowPulse 2.6s ease-in-out infinite",
        "drift": "drift 12s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slowPulse: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(0, -10px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
