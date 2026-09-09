import { describe, expect, it } from "vitest";
import { paymentFailedEmail, feedbackReceivedEmail } from "@/lib/email";

describe("email templates", () => {
  it("payment-failed has subject, plain text, and HTML — never HTML-only", () => {
    const e = paymentFailedEmail();
    expect(e.subject).toMatch(/payment failed/i);
    expect(e.text.length).toBeGreaterThan(20);
    expect(e.html).toMatch(/<!doctype html>/i);
    expect(e.html).toContain("/billing");
    expect(e.text).toContain("/billing");
  });

  it("feedback template escapes user-supplied content in the HTML body", () => {
    const e = feedbackReceivedEmail({
      from: "a@b.co",
      path: "/x",
      message: "<script>alert(1)</script> & \"quotes\"",
    });
    expect(e.html).not.toContain("<script>alert(1)</script>");
    expect(e.html).toContain("&lt;script&gt;");
    // plain text keeps the raw message (not rendered anywhere as markup)
    expect(e.text).toContain("<script>alert(1)</script>");
  });
});
