import { z } from "zod";

/**
 * Centralized, validated environment access.
 *
 * - Server code imports { env }.
 * - Client code imports { publicEnv } (only NEXT_PUBLIC_* values).
 * - Missing REQUIRED vars throw at boot. Optional integrations (Stripe, Resend,
 *   Pinecone, ...) are typed as optional; the corresponding feature module is
 *   responsible for degrading gracefully when its key is absent. We never fake
 *   the integration — see docs/architecture.md "Graceful degradation".
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database (required everywhere)
  DATABASE_PROVIDER: z.enum(["sqlite", "postgresql"]).default("sqlite"),
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().optional(),

  // Auth
  AUTH_MODE: z.enum(["dev", "clerk"]).default("dev"),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  DEV_AUTH_SECRET: z.string().default("dev-only-insecure-secret-change-me"),

  // Supabase (optional until Phase 1.5 storage / prod DB)
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Stripe (Phase 6)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_PREMIUM: z.string().optional(),

  // AI (Phase 4) — Anthropic Claude is the provider
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL_DEFAULT: z.string().default("claude-sonnet-5"),
  AI_MODEL_FAST: z.string().default("claude-haiku-4-5-20251001"),

  // Vector search (Phase 4)
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_INDEX_NAME: z.string().optional(),

  // Redis (Phase 7)
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Email (Phase 7)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  // Error monitoring (Phase 7)
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

function format(issues: z.ZodError["issues"]): string {
  return issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
}

const parsedServer = serverSchema.safeParse(process.env);
if (!parsedServer.success) {
  throw new Error(
    `Invalid server environment variables:\n${format(parsedServer.error.issues)}\n` +
      `Copy .env.example to .env.local and fill in the required values.`,
  );
}

// NEXT_PUBLIC_* are inlined by the bundler, so reference them explicitly.
const parsedPublic = publicSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
});
if (!parsedPublic.success) {
  throw new Error(`Invalid public environment variables:\n${format(parsedPublic.error.issues)}`);
}

export const env = parsedServer.data;
export const publicEnv = parsedPublic.data;

/** True when a given optional integration is configured. */
export const integrations = {
  clerk: env.AUTH_MODE === "clerk" && !!env.CLERK_SECRET_KEY,
  stripe: !!env.STRIPE_SECRET_KEY,
  anthropic: !!env.ANTHROPIC_API_KEY,
  pinecone: !!env.PINECONE_API_KEY && !!env.PINECONE_INDEX_NAME,
  redis: !!env.UPSTASH_REDIS_REST_URL && !!env.UPSTASH_REDIS_REST_TOKEN,
  resend: !!env.RESEND_API_KEY && !!env.RESEND_FROM_EMAIL,
  sentry: !!env.SENTRY_DSN,
  posthog: !!publicEnv.NEXT_PUBLIC_POSTHOG_KEY,
} as const;
