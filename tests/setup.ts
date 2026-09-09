// Deterministic env for tests — set BEFORE any src/ module is imported.
const e = process.env as Record<string, string | undefined>;
e.NODE_ENV = "test";
e.AUTH_MODE = "dev";
e.DEV_AUTH_SECRET = "test-secret";
e.DATABASE_PROVIDER = "sqlite";
e.DATABASE_URL = "file:./prisma/test.db";
e.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
// Ensure no optional integrations are considered configured.
delete process.env.ANTHROPIC_API_KEY;
delete process.env.STRIPE_SECRET_KEY;
delete process.env.RESEND_API_KEY;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.PINECONE_API_KEY;
