/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        // Design Brief tokens (CareConnect Chennai)
        primary: {
          DEFAULT: "#004340",
          container: "#0d5c58",
          hover: "#0a4e4a",
        },

        secondary: {
          DEFAULT: "#0e658c",
          container: "#d1e5f0",
          light: "#e0f2fe",
        },

        tertiary: {
          DEFAULT: "#004525",
          container: "#cbebd5",
          light: "#dcfce7",
        },

        // RESERVED STRICTLY FOR SOS / EMERGENCY
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
          light: "#fee2e2",
        },

        surface: {
          DEFAULT: "#f9f9ff",
          container: "#e7eeff",
          highest: "#d8e3fb",
          lowest: "#ffffff",
          card: "#ffffff",
        },

        "on-surface": {
          DEFAULT: "#111c2d",
          variant: "#3f4947",
        },

        outline: {
          DEFAULT: "#6f7978",
          light: "#cbd5e1",
        },

        brand: {
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
          950: "#042F2E",
        },

        slate: {
          850: "#151F32",
        },
      },

      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],

        // Phase A/B
        heading: [
          "Plus Jakarta Sans",
          "Inter",
          "sans-serif",
        ],

        // Phase C
        display: [
          "Plus Jakarta Sans",
          "Inter",
          "sans-serif",
        ],
      },

      // Phase C touch-friendly UI
      minHeight: {
        touch: "56px",
      },
    },
  },

  plugins: [],
};