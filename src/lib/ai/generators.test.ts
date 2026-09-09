import { describe, expect, it } from "vitest";
import { runGenerator, type GeneratorContext } from "./generators";

// No ANTHROPIC_API_KEY in tests -> always the deterministic rule-based path.

const ctx: GeneratorContext = {
  opportunity: {
    name: "Freelance writing",
    summary: "Write content for businesses.",
    category: "Freelancing",
    revenueModel: "Per-project or retainer.",
    targetCustomer: "B2B SaaS marketing teams",
    monetizationNotes: "Retainers, one-offs.",
    isServiceBased: true,
  },
  profile: {
    primaryGoal: "side_income",
    budgetBand: "lt_50",
    timeBand: "1_hr",
    skillLabels: ["Writing", "SEO"],
  },
};

const KINDS = [
  "offer",
  "outreach",
  "content_plan",
  "business_idea",
  "digital_product",
  "action_plan",
  "analysis",
] as const;

describe("runGenerator (rule-based fallback)", () => {
  for (const kind of KINDS) {
    it(`${kind} returns schema-valid rule-based output`, async () => {
      const r = await runGenerator(kind, "SaaS onboarding emails", ctx);
      expect(r.provider).toBe("rule-based");
      expect(r.kind).toBe(kind);
      expect(r.disclaimer).toMatch(/template/i);
      expect(r.data).toBeTruthy();
    });
  }

  it("never fabricates a guaranteed income claim", async () => {
    const r = await runGenerator("analysis", "dropshipping supplements", ctx);
    const text = JSON.stringify(r.data).toLowerCase();
    expect(text).not.toMatch(/guaranteed (income|profit|revenue)/);
    expect(text).not.toMatch(/you will (earn|make) \$/);
  });

  it("works with no opportunity context", async () => {
    const r = await runGenerator("offer", "logo design", { opportunity: null, profile: null });
    expect(r.data).toBeTruthy();
  });
});
