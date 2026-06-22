import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4317",
        rewrite: (url) => url.replace(/^\/api/, "")
      }
    }
  },
  resolve: {
    alias: {
      "@vcm-testbed/domain": path.resolve(__dirname, "../../packages/domain/src/index.ts")
    }
  }
});

