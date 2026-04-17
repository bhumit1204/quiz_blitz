import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#07071A",
        surface: "#0E0E2C",
        elevated: "#161638",
        "accent-cyan": "#00D4FF",
        "accent-purple": "#9B5DE5",
        "accent-green": "#00FF88",
        "accent-red": "#FF3366",
        "accent-yellow": "#FFD700",
        "accent-orange": "#FF6B35",
        textPrimary: "#EEF2FF",
        textMuted: "#6B7280",
      },
      fontFamily: {
        display: ["var(--font-exo2)", "sans-serif"],
        headings: ["var(--font-rajdhani)", "sans-serif"],
        code: ["var(--font-space-mono)", "monospace"],
        mono: ["var(--font-space-mono)", "monospace"],
      },
      boxShadow: {
        "neon-cyan": "0 0 10px #00D4FF, 0 0 30px rgba(0,212,255,0.3)",
        "neon-purple": "0 0 10px #9B5DE5, 0 0 30px rgba(155,93,229,0.3)",
        "neon-green": "0 0 10px #00FF88, 0 0 30px rgba(0,255,136,0.3)",
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "bounce-slow": "bounce 2s infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
export default config;