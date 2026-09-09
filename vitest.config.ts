import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    globalSetup: ["tests/global-setup.ts"],
    hookTimeout: 30000,
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/server/services/**"],
      reporter: ["text", "html"],
    },
  },
});
