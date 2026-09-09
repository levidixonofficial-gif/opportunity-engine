// Deterministic env for tests — set BEFORE any src/ module is imported.
process.env.NODE_ENV = "test";
process.env.AUTH_MODE = "dev";
process.env.DEV_AUTH_SECRET = "test-secret";
process.env.DATABASE_PROVIDER = "sqlite";
process.env.DATABASE_URL = "file:./prisma/test.db";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
// Ensure no optional integrations are considered configured.
delete process.env.ANTHROPIC_API_KEY;
delete process.env.STRIPE_SECRET_KEY;
delete process.env.RESEND_API_KEY;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.PINECONE_API_KEY;
