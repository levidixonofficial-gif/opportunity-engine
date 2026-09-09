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
    // DB-backed suites share one prisma/test.db, so run test files serially to
    // avoid cross-file resetDb() races.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/server/services/**"],
      reporter: ["text", "html"],
    },
  },
});
