import { describe, expect, it } from "vitest";
import { attributionFromSearch, attributionSchema, hasAnyAttribution, parseAttributionCookie } from "./attribution";

describe("attribution", () => {
  it("extracts known utm params and ignores unknown ones", () => {
    const params = new URLSearchParams(
      "utm_source=newsletter&utm_medium=email&utm_campaign=launch&evil=<script>&admin=true",
    );
    const a = attributionFromSearch(params, { path: "/", referrer: "https://x.com" });
    expect(a.source).toBe("newsletter");
    expect(a.medium).toBe("email");
    expect(a.campaign).toBe("launch");
    expect(Object.keys(a)).not.toContain("evil");
    expect(Object.keys(a)).not.toContain("admin");
  });

  it("rejects control characters / oversized values", () => {
    const bad = attributionSchema.safeParse({ source: "a".repeat(500) });
    expect(bad.success).toBe(false);
  });

  it("parseAttributionCookie returns null for garbage", () => {
    expect(parseAttributionCookie("not json")).toBeNull();
    expect(parseAttributionCookie(undefined)).toBeNull();
  });

  it("parseAttributionCookie round-trips a valid payload", () => {
    const json = JSON.stringify({ source: "twitter", medium: "social" });
    const parsed = parseAttributionCookie(json);
    expect(parsed?.source).toBe("twitter");
  });

  it("hasAnyAttribution detects empties", () => {
    expect(hasAnyAttribution(null)).toBe(false);
    expect(hasAnyAttribution({})).toBe(false);
    expect(hasAnyAttribution({ source: "x" })).toBe(true);
  });
});
