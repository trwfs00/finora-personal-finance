import forms from "@tailwindcss/forms";
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        green: {
          50: "#f1fbe9",
          100: "#e5f3d9",
          200: "#cbe4b5",
          300: "#afd58e",
          400: "#97c86d",
          500: "#88c058",
          600: "#7bba46",
          700: "#6ca53c",
          800: "#5f9333",
          900: "#4f7f26",
        },
        bg: "oklch(var(--bg) / <alpha-value>)",
        surface: "oklch(var(--surface) / <alpha-value>)",
        "surface-2": "oklch(var(--surface-2) / <alpha-value>)",
        ink: "oklch(var(--ink) / <alpha-value>)",
        muted: "oklch(var(--muted) / <alpha-value>)",
        line: "oklch(var(--line) / <alpha-value>)",
        primary: "oklch(var(--primary) / <alpha-value>)",
        accent: "oklch(var(--accent) / <alpha-value>)",
        success: "oklch(var(--success) / <alpha-value>)",
        warning: "oklch(var(--warning) / <alpha-value>)",
        danger: "oklch(var(--danger) / <alpha-value>)",
      },
      boxShadow: {
        panel: "0 1px 2px oklch(var(--ink) / 0.06)",
      },
      borderRadius: {
        xl: "0.75rem",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [forms],
} satisfies Config;
