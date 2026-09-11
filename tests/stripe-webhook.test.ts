import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { resetDb, db, makeUser } from "./db";

/**
 * Stripe webhook route. Signature verification is exercised for real (Stripe's
 * own `generateTestHeaderString` + `constructEvent`) — only @/lib/env and
 * @/lib/analytics are mocked, so the route sees a configured Stripe + a
 * spyable `track()`. Network-calling Stripe SDK methods (`subscriptions.retrieve`,
 * used by the new invoice.payment_succeeded handler) are stubbed per-test.
 */
const { WEBHOOK_SECRET, PRICE_PRO, PRICE_PREMIUM } = vi.hoisted(() => ({
  WEBHOOK_SECRET: "whsec_test_" + "a".repeat(32),
  PRICE_PRO: "price_pro_test",
  PRICE_PREMIUM: "price_premium_test",
}));

vi.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "test",
    AUTH_MODE: "dev",
    STRIPE_SECRET_KEY: "sk_test_fake",
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    STRIPE_PRICE_PRO: PRICE_PRO,
    STRIPE_PRICE_PREMIUM: PRICE_PREMIUM,
    DEV_AUTH_SECRET: "test-secret",
    DATABASE_PROVIDER: process.env.DATABASE_PROVIDER ?? "postgresql",
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
  },
  publicEnv: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
  integrations: { stripe: true, clerk: false },
  productionConfigProblems: () => [],
}));

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

const { POST } = await import("@/app/api/webhooks/stripe/route");
const { planForPrice, normalizeStatus, stripe } = await import("@/lib/stripe");
const { track } = await import("@/lib/analytics");

const sdk = new Stripe("sk_test_fake");

function signedRequest(event: Record<string, unknown>) {
  const body = JSON.stringify(event);
  const header = sdk.webhooks.generateTestHeaderString({ payload: body, secret: WEBHOOK_SECRET });
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
    headers: { "stripe-signature": header },
  });
}

const stripeEvent = (id: string, type: string, object: Record<string, unknown>) => ({
  id,
  object: "event",
  type,
  data: { object },
});

beforeEach(async () => {
  await resetDb();
  vi.mocked(track).mockClear();
});

describe("stripe helpers", () => {
  it("maps unknown price ids to free", () => {
    expect(planForPrice(null)).toBe("free");
    expect(planForPrice("price_unknown")).toBe("free");
  });

  it("normalizes subscription status to the stored set", () => {
    expect(normalizeStatus("active")).toBe("active");
    expect(normalizeStatus("trialing")).toBe("trialing");
    expect(normalizeStatus("incomplete_expired")).toBe("canceled");
    expect(normalizeStatus("weird_value")).toBe("incomplete");
  });
});

describe("POST /api/webhooks/stripe", () => {
  it("rejects an invalid signature (400) and writes nothing", async () => {
    const res = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ type: "customer.subscription.updated" }),
        headers: { "stripe-signature": "t=1,v1=deadbeef" },
      }),
    );
    expect(res.status).toBe(400);
    expect(await db.webhookEvent.count()).toBe(0);
  });

  it("checkout.session.completed links the customer and tracks a one-time activation event", async () => {
    const user = await makeUser("buyer@test.com");
    await db.subscription.update({ where: { userId: user.id }, data: { stripeCustomerId: null } });

    const res = await POST(
      signedRequest(
        stripeEvent("evt_checkout_1", "checkout.session.completed", {
          customer: "cus_1",
          client_reference_id: user.id,
          metadata: { userId: user.id, plan: "pro" },
        }),
      ),
    );
    expect(res.status).toBe(200);

    const sub = await db.subscription.findUnique({ where: { userId: user.id } });
    expect(sub?.stripeCustomerId).toBe("cus_1");
    expect(track).toHaveBeenCalledWith(user.id, "subscription_activated", { plan: "pro" });
  });

  it("does not track subscription_activated on any other event type", async () => {
    const user = await makeUser("other-event@test.com");
    await POST(
      signedRequest(
        stripeEvent("evt_failed_1", "invoice.payment_failed", { customer: "cus_missing" }),
      ),
    );
    expect(track).not.toHaveBeenCalledWith(expect.anything(), "subscription_activated", expect.anything());
    void user;
  });

  describe("invoice.payment_succeeded", () => {
    it("re-syncs an existing subscription from the authoritative Stripe object", async () => {
      const user = await makeUser("renew@test.com");
      await db.subscription.update({
        where: { userId: user.id },
        data: { stripeCustomerId: "cus_renew", stripeSubscriptionId: "sub_renew", plan: "free", status: "past_due" },
      });

      vi.spyOn(stripe().subscriptions, "retrieve").mockResolvedValue({
        id: "sub_renew",
        customer: "cus_renew",
        status: "active",
        cancel_at_period_end: false,
        items: { data: [{ price: { id: PRICE_PRO }, current_period_end: 1_900_000_000 }] },
      } as never);

      const res = await POST(
        signedRequest(
          stripeEvent("evt_invoice_1", "invoice.payment_succeeded", {
            customer: "cus_renew",
            parent: { type: "subscription_details", subscription_details: { subscription: "sub_renew" } },
          }),
        ),
      );
      expect(res.status).toBe(200);

      const sub = await db.subscription.findUnique({ where: { userId: user.id } });
      expect(sub?.status).toBe("active");
      expect(sub?.plan).toBe("pro");
    });

    it("does NOT create or activate a subscription for a customer with no existing row", async () => {
      const retrieveSpy = vi.spyOn(stripe().subscriptions, "retrieve");
      const res = await POST(
        signedRequest(
          stripeEvent("evt_invoice_2", "invoice.payment_succeeded", {
            customer: "cus_unknown",
            parent: { type: "subscription_details", subscription_details: { subscription: "sub_unknown" } },
          }),
        ),
      );
      expect(res.status).toBe(200);
      // Never even called Stripe to look it up — no local row, nothing to sync.
      expect(retrieveSpy).not.toHaveBeenCalled();
      expect(await db.subscription.count({ where: { stripeCustomerId: "cus_unknown" } })).toBe(0);
    });

    it("ignores a non-subscription invoice (no parent.subscription_details)", async () => {
      const retrieveSpy = vi.spyOn(stripe().subscriptions, "retrieve");
      const res = await POST(
        signedRequest(
          stripeEvent("evt_invoice_3", "invoice.payment_succeeded", { customer: "cus_oneoff", parent: null }),
        ),
      );
      expect(res.status).toBe(200);
      expect(retrieveSpy).not.toHaveBeenCalled();
    });

    it("is idempotent — a redelivered event id is a no-op", async () => {
      const user = await makeUser("dup-invoice@test.com");
      await db.subscription.update({
        where: { userId: user.id },
        data: { stripeCustomerId: "cus_dup", stripeSubscriptionId: "sub_dup", status: "past_due" },
      });
      vi.spyOn(stripe().subscriptions, "retrieve").mockResolvedValue({
        id: "sub_dup",
        customer: "cus_dup",
        status: "active",
        cancel_at_period_end: false,
        items: { data: [{ price: { id: PRICE_PRO }, current_period_end: 1_900_000_000 }] },
      } as never);

      const event = stripeEvent("evt_invoice_dup", "invoice.payment_succeeded", {
        customer: "cus_dup",
        parent: { type: "subscription_details", subscription_details: { subscription: "sub_dup" } },
      });
      expect((await POST(signedRequest(event))).status).toBe(200);
      const second = await POST(signedRequest(event));
      expect(second.status).toBe(200);
      expect(await second.json()).toMatchObject({ duplicate: true });
      expect(await db.webhookEvent.count({ where: { provider: "stripe", eventId: "evt_invoice_dup" } })).toBe(1);
    });
  });

  it("returns 501 when Stripe is not configured (separate module state)", async () => {
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({
      env: { STRIPE_SECRET_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined, DATABASE_PROVIDER: "postgresql", DATABASE_URL: process.env.DATABASE_URL, DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL, NODE_ENV: "test" },
      // Real value, not {} — the route imports @/lib/email (used by invoice.payment_failed),
      // and with isolate:false its cached module instance would otherwise leak an
      // undefined NEXT_PUBLIC_APP_URL into every test file that runs after this one.
      publicEnv: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
      integrations: { stripe: false },
      productionConfigProblems: () => [],
    }));
    const mod = await import("@/app/api/webhooks/stripe/route");
    const res = await mod.POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ type: "customer.subscription.updated" }),
        headers: { "stripe-signature": "t=1,v1=deadbeef" },
      }),
    );
    expect(res.status).toBe(501);
    vi.doUnmock("@/lib/env");
    // With isolate:false the module graph is shared across test files — without
    // this, modules re-imported above would stay cached bound to this test's
    // doMock'd env and leak into whichever file runs next.
    vi.resetModules();
  });

  it("never echoes a raw error message", async () => {
    const res = await POST(
      new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "garbage", headers: {} }),
    );
    const body = await res.json().catch(() => ({}));
    expect(JSON.stringify(body)).not.toMatch(/stack|prisma|at Object|node_modules/i);
  });
});
