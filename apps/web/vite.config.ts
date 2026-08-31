import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("viem")) return "viem";
          if (id.includes("@noble") || id.includes("@scure")) return "crypto";
          if (id.includes("genlayer-js")) return "genlayer";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("react")) return "react";
        }
      }
    }
  }
});
