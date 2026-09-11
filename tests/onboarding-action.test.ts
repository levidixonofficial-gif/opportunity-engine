import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * submitOnboardingAction is a "use server" action gated by requireUser(), which
 * reads next/headers' request-scoped cookies() — not available outside Next's
 * request pipeline. So (like requireUser itself) we mock the boundaries —
 * @/lib/auth, the onboarding service, next/navigation's redirect — and assert
 * the action's own new wiring: track() fires with the right args, in the right
 * order relative to submitOnboarding()/redirect(), and only on a valid submit.
 */
const mockUser = { id: "user_1", clerkId: "clerk_1", email: "test@example.com" };

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn(async () => mockUser) }));
vi.mock("@/server/services/onboarding", () => ({ submitOnboarding: vi.fn(async () => undefined) }));
vi.mock("@/lib/analytics", () => ({ track: vi.fn(async () => undefined) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

const { requireUser } = await import("@/lib/auth");
const { submitOnboarding } = await import("@/server/services/onboarding");
const { track } = await import("@/lib/analytics");
const { redirect } = await import("next/navigation");
const { submitOnboardingAction } = await import("@/app/onboarding/actions");

function validFormData(over: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("primaryGoal", over.primaryGoal ?? "side_income");
  fd.set("budgetBand", over.budgetBand ?? "50_250");
  fd.set("timeBand", over.timeBand ?? "1_hr");
  fd.set("experienceLevel", over.experienceLevel ?? "none");
  return fd;
}

beforeEach(() => {
  vi.mocked(requireUser).mockClear();
  vi.mocked(submitOnboarding).mockClear();
  vi.mocked(track).mockClear();
  vi.mocked(redirect).mockClear();
});

describe("submitOnboardingAction", () => {
  it("submits onboarding, tracks onboarding_completed, then redirects", async () => {
    const order: string[] = [];
    vi.mocked(submitOnboarding).mockImplementationOnce(async () => {
      order.push("submit");
    });
    vi.mocked(track).mockImplementationOnce(async () => {
      order.push("track");
    });
    vi.mocked(redirect).mockImplementationOnce(() => {
      order.push("redirect");
      throw new Error("NEXT_REDIRECT");
    });

    await expect(submitOnboardingAction({}, validFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(submitOnboarding).toHaveBeenCalledWith(mockUser.id, expect.objectContaining({ primaryGoal: "side_income" }));
    expect(track).toHaveBeenCalledWith(mockUser.id, "onboarding_completed", { primaryGoal: "side_income" });
    expect(redirect).toHaveBeenCalledWith("/dashboard");
    expect(order).toEqual(["submit", "track", "redirect"]);
  });

  it("does not track or submit when the form is invalid", async () => {
    const result = await submitOnboardingAction({}, validFormData({ primaryGoal: "not_a_real_goal" }));
    expect(result).toEqual({ error: "Please answer every step before continuing." });
    expect(submitOnboarding).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
