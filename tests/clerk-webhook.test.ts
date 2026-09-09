import { beforeEach, describe, expect, it, vi } from "vitest";
import { Webhook } from "standardwebhooks";
import { resetDb, db } from "./db";

/**
 * Clerk webhook route. Signature verification is exercised for real (via
 * standardwebhooks, the same library Clerk uses) — only @/lib/env is mocked so
 * the route sees AUTH_MODE=clerk + a known signing secret.
 */
const { SIGNING_SECRET } = vi.hoisted(() => ({
  SIGNING_SECRET: "whsec_" + Buffer.from("test-clerk-signing-secret").toString("base64"),
}));

vi.mock("@/lib/env", () => {
  const env = {
    NODE_ENV: "test",
    AUTH_MODE: "clerk",
    CLERK_WEBHOOK_SECRET: SIGNING_SECRET,
    CLERK_SECRET_KEY: "sk_test_x",
    DATABASE_PROVIDER: "sqlite",
    DATABASE_URL: "file:./prisma/test.db",
    DEV_AUTH_SECRET: "test-secret",
  };
  return {
    env,
    publicEnv: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
    integrations: { clerk: true, stripe: false, sentry: false },
    productionConfigProblems: () => [],
  };
});

const { POST } = await import("@/app/api/webhooks/clerk/route");

const wh = new Webhook(SIGNING_SECRET);

function signedRequest(payload: unknown, opts: { id?: string; badSig?: boolean; ts?: Date } = {}) {
  const id = opts.id ?? `msg_${Math.random().toString(36).slice(2)}`;
  const ts = opts.ts ?? new Date();
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  const signature = opts.badSig ? "v1,not-a-real-signature" : wh.sign(id, ts, body);
  return new Request("http://localhost/api/webhooks/clerk", {
    method: "POST",
    body,
    headers: {
      "svix-id": id,
      "svix-timestamp": String(Math.floor(ts.getTime() / 1000)),
      "svix-signature": signature,
    },
  }) as never;
}

const userCreated = (over: Record<string, unknown> = {}) => ({
  type: "user.created",
  object: "event",
  data: {
    id: "user_clerk_1",
    email_addresses: [{ id: "idn_1", email_address: "new@example.com" }],
    primary_email_address_id: "idn_1",
    first_name: "New",
    last_name: "User",
    image_url: "https://img.clerk/x.png",
    ...over,
  },
});

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/webhooks/clerk", () => {
  it("rejects a request with no/invalid signature (401) and writes nothing", async () => {
    const res = await POST(signedRequest(userCreated(), { badSig: true }));
    expect(res.status).toBe(401);
    expect(await db.user.count()).toBe(0);
    expect(await db.webhookEvent.count()).toBe(0);
  });

  it("rejects a bare unsigned request (401)", async () => {
    const res = await POST(
      new Request("http://localhost/api/webhooks/clerk", { method: "POST", body: "{}" }) as never,
    );
    expect(res.status).toBe(401);
  });

  it("rejects a validly-signed but malformed payload (400)", async () => {
    const res = await POST(signedRequest({ type: "user.created", data: {} }));
    expect(res.status).toBe(400);
    expect(await db.user.count()).toBe(0);
  });

  it("processes a valid user.created — mirrors the User row", async () => {
    const res = await POST(signedRequest(userCreated()));
    expect(res.status).toBe(200);
    const u = await db.user.findUnique({ where: { clerkId: "user_clerk_1" } });
    expect(u?.email).toBe("new@example.com");
    expect(u?.name).toBe("New User");
    // provisioned side rows
    expect(await db.subscription.count({ where: { userId: u!.id } })).toBe(1);
    expect(await db.notificationPreference.count({ where: { userId: u!.id } })).toBe(1);
  });

  it("is idempotent — a redelivered event (same svix-id) is a no-op 200", async () => {
    const req1 = signedRequest(userCreated(), { id: "msg_dup" });
    const req2 = signedRequest(userCreated({ first_name: "Renamed" }), { id: "msg_dup" });
    expect((await POST(req1)).status).toBe(200);
    const second = await POST(req2);
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ duplicate: true });
    // the second payload's rename must NOT have been applied
    const u = await db.user.findUnique({ where: { clerkId: "user_clerk_1" } });
    expect(u?.name).toBe("New User");
    expect(await db.webhookEvent.count({ where: { provider: "clerk" } })).toBe(1);
  });

  it("user.updated changes only Clerk-owned fields, never role or owned data", async () => {
    await db.user.create({
      data: { clerkId: "user_clerk_1", email: "old@example.com", name: "Old", role: "admin" },
    });
    const res = await POST(
      signedRequest(userCreated({ email_addresses: [{ id: "idn_1", email_address: "fresh@example.com" }] })),
    );
    expect(res.status).toBe(200);
    const u = await db.user.findUnique({ where: { clerkId: "user_clerk_1" } });
    expect(u?.email).toBe("fresh@example.com");
    expect(u?.role).toBe("admin"); // untouched
  });

  it("user.deleted removes the mirrored row (owned data cascades)", async () => {
    const u = await db.user.create({
      data: { clerkId: "user_clerk_1", email: "gone@example.com", projects: { create: { name: "P", status: "idea" } } },
    });
    expect(await db.project.count({ where: { userId: u.id } })).toBe(1);
    const res = await POST(signedRequest({ type: "user.deleted", object: "event", data: { id: "user_clerk_1", deleted: true } }));
    expect(res.status).toBe(200);
    expect(await db.user.count({ where: { clerkId: "user_clerk_1" } })).toBe(0);
    expect(await db.project.count()).toBe(0);
  });

  it("user.deleted for an unknown user is a safe 200 no-op", async () => {
    const res = await POST(signedRequest({ type: "user.deleted", object: "event", data: { id: "user_missing", deleted: true } }));
    expect(res.status).toBe(200);
  });

  it("a user.created with no email does not write a broken row", async () => {
    const res = await POST(signedRequest(userCreated({ email_addresses: [], primary_email_address_id: null })));
    expect(res.status).toBe(200);
    expect(await db.user.count()).toBe(0);
  });
});

describe("POST /api/webhooks/clerk — unconfigured", () => {
  it("returns 501 when AUTH_MODE!=clerk (separate module state)", async () => {
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({
      env: { AUTH_MODE: "dev", CLERK_WEBHOOK_SECRET: undefined, DATABASE_PROVIDER: "sqlite", DATABASE_URL: "file:./prisma/test.db", NODE_ENV: "test" },
      publicEnv: {},
      integrations: { clerk: false },
      productionConfigProblems: () => [],
    }));
    const mod = await import("@/app/api/webhooks/clerk/route");
    const res = await mod.POST(
      new Request("http://localhost/api/webhooks/clerk", { method: "POST", body: "{}" }) as never,
    );
    expect(res.status).toBe(501);
    vi.doUnmock("@/lib/env");
  });
});
