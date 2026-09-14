import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "var(--font-sans)",
          "Inter",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          DEFAULT: "#1C2027",
          900: "#111418",
          800: "#191D23",
          700: "#262B34",
          600: "#3A414D",
          500: "#5A6472",
        },
        brand: {
          50: "#FFFAEA",
          100: "#FBEFC4",
          200: "#F6DD8A",
          300: "#EFC957",
          400: "#DDB13D",
          500: "#B88A1E",
          600: "#906817",
          700: "#704F17",
          800: "#573F18",
          900: "#443216",
        },
        paper: {
          DEFAULT: "#F7F7F5",
          50: "#FBFBFA",
          100: "#F1F2EF",
          200: "#E5E7E3",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgb(15 23 42 / 0.04)",
        soft: "0 8px 20px -16px rgb(15 23 42 / 0.22)",
        lift: "0 16px 32px -24px rgb(15 23 42 / 0.30)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        pop: {
          from: { opacity: "0", transform: "translateY(4px) scale(0.99)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "sheet-down": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "page-enter": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.16s ease-out both",
        "fade-up": "fade-up 0.16s ease-out both",
        pop: "pop 0.18s ease-out both",
        "sheet-up": "sheet-up 0.24s ease-out both",
        "sheet-down": "sheet-down 0.2s ease-in both",
        "fade-out": "fade-out 0.16s ease-in both",
        float: "float 4s ease-in-out infinite",
        "page-enter": "page-enter 0.12s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
