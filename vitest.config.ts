import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      // DB-backed suites run against an in-process PGlite Postgres — see
      // tests/stubs/db.ts. Must precede the "@" alias (first match wins).
      "@/lib/db": path.resolve(__dirname, "tests/stubs/db.ts"),
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    hookTimeout: 30000,
    testTimeout: 15000,
    // One PGlite instance is shared across every suite: fileParallelism:false
    // pins the run to a single worker and isolate:false shares one module graph,
    // so there is exactly one Prisma client / connection for the whole run.
    // resetDb() in beforeEach keeps suites independent.
    fileParallelism: false,
    isolate: false,
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/server/services/**"],
      reporter: ["text", "html"],
    },
  },
});
