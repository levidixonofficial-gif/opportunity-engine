import { beforeEach, describe, expect, it } from "vitest";
import { makeUser, resetDb } from "./db";
import * as money from "@/server/services/money";
import * as crm from "@/server/services/crm";
import * as projects from "@/server/services/projects";
import * as goals from "@/server/services/goals";

let uid: string;
beforeEach(async () => {
  await resetDb();
  uid = (await makeUser("val@test.com")).id;
});

describe("input validation — malformed / missing / boundary", () => {
  it("transaction: rejects zero, negative, and non-integer amounts", async () => {
    for (const bad of [0, -100, 12.5]) {
      await expect(
        money.createTransaction(uid, {
          type: "revenue",
          amountCents: bad,
          currency: "USD",
          occurredOn: new Date(),
          isEstimated: false,
          isRecurring: false,
        }),
      ).rejects.toThrow();
    }
  });

  it("transaction: rejects an invalid type / currency length", async () => {
    await expect(
      // @ts-expect-error bad type on purpose
      money.createTransaction(uid, { type: "gift", amountCents: 100, currency: "USD", occurredOn: new Date(), isEstimated: false, isRecurring: false }),
    ).rejects.toThrow();
    await expect(
      money.createTransaction(uid, { type: "revenue", amountCents: 100, currency: "US", occurredOn: new Date(), isEstimated: false, isRecurring: false }),
    ).rejects.toThrow();
  });

  it("contact: rejects empty name and over-long name (>120)", async () => {
    await expect(crm.createContact(uid, { name: "", stage: "lead", verificationStatus: "unverified" })).rejects.toThrow();
    await expect(
      crm.createContact(uid, { name: "a".repeat(121), stage: "lead", verificationStatus: "unverified" }),
    ).rejects.toThrow();
  });

  it("contact: rejects an invalid stage / verification status", async () => {
    // @ts-expect-error bad stage
    await expect(crm.createContact(uid, { name: "X", stage: "customer", verificationStatus: "unverified" })).rejects.toThrow();
  });

  it("project: rejects a 1-char name; accepts the 2-char minimum", async () => {
    await expect(projects.createProject(uid, { name: "P", status: "idea" })).rejects.toThrow();
    const ok = await projects.createProject(uid, { name: "PP", status: "idea" });
    expect(ok.name).toBe("PP");
  });

  it("project: rejects an invalid status", async () => {
    // @ts-expect-error bad status
    await expect(projects.createProject(uid, { name: "Valid", status: "shipping" })).rejects.toThrow();
  });

  it("goal: rejects a non-positive target and an unknown metric", async () => {
    await expect(goals.createGoal(uid, { title: "G", metric: "revenue", targetValue: 0 })).rejects.toThrow();
    // @ts-expect-error bad metric
    await expect(goals.createGoal(uid, { title: "G", metric: "vibes", targetValue: 100 })).rejects.toThrow();
  });

  it("invalid IDs on lookups resolve to not-found, never another user's row", async () => {
    const other = (await makeUser("other@test.com")).id;
    const theirs = await projects.createProject(other, { name: "Theirs", status: "idea" });
    expect(await projects.getProject(uid, "does-not-exist")).toBeNull();
    expect(await projects.getProject(uid, theirs.id)).toBeNull();
    expect(await crm.getContact(uid, "nope")).toBeNull();
  });

  it("nonexistent resource mutations throw NotFound, not a raw DB error", async () => {
    await expect(projects.updateProject(uid, "missing", { name: "x" })).rejects.toMatchObject({ name: "NotFoundError" });
    await expect(money.deleteTransaction(uid, "missing")).rejects.toMatchObject({ name: "NotFoundError" });
    await expect(goals.deleteGoal(uid, "missing")).rejects.toMatchObject({ name: "NotFoundError" });
  });
});
