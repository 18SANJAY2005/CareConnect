/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#004340",
          container: "#0d5c58",
        },
        secondary: {
          DEFAULT: "#0e658c",
          light: "#e0f2fe",
        },
        tertiary: {
          DEFAULT: "#004525",
          light: "#dcfce7",
        },
        error: {
          DEFAULT: "#ba1a1a",
          light: "#fee2e2",
        },
        surface: {
          DEFAULT: "#f9f9ff",
          card: "#ffffff",
          container: "#e7eeff",
          highest: "#d8e3fb",
        },
        "on-surface": {
          DEFAULT: "#111c2d",
          variant: "#3f4947",
        },
        outline: {
          DEFAULT: "#6f7978",
          light: "#cbd5e1",
        },
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      minHeight: {
        56: "56px",
        44: "44px",
      },
      boxShadow: {
        card: "0 2px 8px -2px rgba(17, 28, 45, 0.08), 0 1px 4px -1px rgba(17, 28, 45, 0.04)",
        elevated:
          "0 10px 25px -5px rgba(0, 67, 64, 0.12), 0 8px 10px -6px rgba(0, 67, 64, 0.04)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};
