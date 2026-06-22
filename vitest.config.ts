import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "apps/**/*.test.ts",
      "packages/**/*.test.ts"
    ]
  },
  resolve: {
    alias: {
      "@vcm-testbed/domain": path.resolve(__dirname, "packages/domain/src/index.ts"),
      "@vcm-testbed/db": path.resolve(__dirname, "packages/db/src/index.ts")
    }
  }
});

