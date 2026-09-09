import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "@prisma/config";

// Prisma 7 no longer auto-loads .env for the CLI/config layer.
loadEnv({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
