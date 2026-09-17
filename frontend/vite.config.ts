import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    watch: {
      ignored: ["**/node_modules/**", "**/.git/**"],
    },
  },

  optimizeDeps: {
    include: ["react", "react-dom", "lucide-react"],
  },
});
