import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import { GET as healthGET } from "@/app/api/health/route";
import { POST as stripePOST } from "@/app/api/webhooks/stripe/route";
import { POST as clerkPOST } from "@/app/api/webhooks/clerk/route";
import { productionConfigProblems } from "@/lib/env";

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/health", () => {
  it("returns 200 ok and does NOT leak integration/config detail", async () => {
    const res = await healthGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body).not.toHaveProperty("integrations");
    expect(body).not.toHaveProperty("checks");
    expect(JSON.stringify(body)).not.toMatch(/key|secret|token|url|postgres|sqlite/i);
  });
});

describe("POST /api/webhooks/stripe", () => {
  const req = (body: unknown, headers: Record<string, string> = {}) =>
    new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers,
    });

  it("refuses (501) when Stripe is not configured — does not process unverified events", async () => {
    const res = await stripePOST(req({ type: "customer.subscription.updated" }, { "stripe-signature": "t=1,v1=x" }));
    expect(res.status).toBe(501);
  });

  it("never echoes a raw error message", async () => {
    const res = await stripePOST(req("garbage", {}));
    const body = await res.json().catch(() => ({}));
    expect(JSON.stringify(body)).not.toMatch(/stack|prisma|at Object|node_modules/i);
  });
});

describe("POST /api/webhooks/clerk", () => {
  it("returns 501 until AUTH_MODE=clerk + secret are set", async () => {
    const res = await clerkPOST();
    expect(res.status).toBe(501);
  });
});

describe("production configuration gate", () => {
  const base = {
    AUTH_MODE: "dev" as const,
    CLERK_SECRET_KEY: undefined,
    DEV_AUTH_SECRET: "dev-only-insecure-secret-change-me",
    DATABASE_PROVIDER: "sqlite" as const,
  };

  it("flags every insecure dev default", () => {
    const problems = productionConfigProblems(
      // @ts-expect-error partial is fine for this pure check
      base,
      { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
    );
    expect(problems.join(" ")).toMatch(/AUTH_MODE/);
    expect(problems.join(" ")).toMatch(/DEV_AUTH_SECRET/);
    expect(problems.join(" ")).toMatch(/DATABASE_PROVIDER/);
    expect(problems.join(" ")).toMatch(/localhost/);
  });

  it("passes for a correct production config", () => {
    const problems = productionConfigProblems(
      // @ts-expect-error partial
      {
        AUTH_MODE: "clerk",
        CLERK_SECRET_KEY: "sk_live_x",
        DEV_AUTH_SECRET: "a-real-random-secret",
        DATABASE_PROVIDER: "postgresql",
      },
      { NEXT_PUBLIC_APP_URL: "https://app.example.com", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_x" },
    );
    expect(problems).toEqual([]);
  });
});
