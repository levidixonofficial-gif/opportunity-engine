import { describe, expect, it } from "vitest";
import { entitlementsFor, hasFeature, checkUsage } from "./index";

describe("entitlements", () => {
  it("free plan is the fallback for unknown plans", () => {
    // @ts-expect-error deliberate bad input
    expect(entitlementsFor("nonsense").plan).toBe("free");
  });

  it("free plan gates paid features", () => {
    expect(hasFeature("free", "crm")).toBe(false);
    expect(hasFeature("free", "advanced_ai")).toBe(false);
  });

  it("pro unlocks crm + analytics but not advanced_ai", () => {
    expect(hasFeature("pro", "crm")).toBe(true);
    expect(hasFeature("pro", "advanced_analytics")).toBe(true);
    expect(hasFeature("pro", "advanced_ai")).toBe(false);
  });

  it("premium unlocks everything", () => {
    expect(hasFeature("premium", "advanced_ai")).toBe(true);
    expect(entitlementsFor("premium").limits.aiMessagesPerMonth).toBeNull();
  });

  it("checkUsage enforces a finite limit", () => {
    const at = checkUsage("free", "aiMessagesPerMonth", 15);
    expect(at.allowed).toBe(false);
    expect(at.remaining).toBe(0);
    const under = checkUsage("free", "aiMessagesPerMonth", 3);
    expect(under.allowed).toBe(true);
    expect(under.remaining).toBe(12);
  });

  it("checkUsage treats null limit as unlimited", () => {
    const r = checkUsage("premium", "aiMessagesPerMonth", 99999);
    expect(r.allowed).toBe(true);
    expect(r.limit).toBeNull();
    expect(r.remaining).toBeNull();
  });
});
