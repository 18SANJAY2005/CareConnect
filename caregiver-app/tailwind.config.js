/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#004340",
          50: "#e6f4f3",
          100: "#cce8e7",
          500: "#007a75",
          600: "#004340",
          700: "#003634",
        },
        secondary: {
          DEFAULT: "#0e658c",
          50: "#e0f2fe",
          100: "#bae6fd",
          500: "#0e658c",
          600: "#094d6b",
        },
        tertiary: {
          DEFAULT: "#004525",
          50: "#dcfce7",
          100: "#bbf7d0",
          500: "#16a34a",
        },
        error: {
          DEFAULT: "#ba1a1a",
          50: "#fee2e2",
          500: "#ef4444",
          600: "#ba1a1a",
        },
        surface: {
          DEFAULT: "#f8fafc",
          card: "#ffffff",
          subtle: "#f1f5f9",
        }
      },
    },
  },
  plugins: [],
}
