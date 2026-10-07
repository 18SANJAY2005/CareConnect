import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: '/admin/',
  plugins: [react()],

  server: {
    port: 5175,
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ["**/node_modules/**", "**/.git/**"],
    },
  },

  preview: {
    port: 5175,
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },

  optimizeDeps: {
    include: ["react", "react-dom", "lucide-react", "leaflet", "react-leaflet"],
  },
});
