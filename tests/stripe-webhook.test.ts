import { describe, expect, it } from "vitest";
import { planForPrice, normalizeStatus } from "@/lib/stripe";
import { POST } from "@/app/api/webhooks/stripe/route";

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

describe("stripe webhook route", () => {
  it("returns 501 when Stripe is not configured", async () => {
    const res = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ type: "customer.subscription.updated" }),
        headers: { "stripe-signature": "t=1,v1=deadbeef" },
      }),
    );
    // With no STRIPE_SECRET_KEY/WEBHOOK_SECRET in the test env, the route refuses
    // rather than processing an unverified event.
    expect(res.status).toBe(501);
  });
});
