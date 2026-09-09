import { beforeEach, describe, expect, it } from "vitest";
import { db, makeUser, resetDb } from "./db";
import * as admin from "@/server/services/admin";
import { devSetPlan } from "@/server/services/checkout";

beforeEach(async () => {
  await resetDb();
});

describe("admin service", () => {
  it("setUserRole refuses to let an admin demote themselves", async () => {
    const a = await makeUser("admin@test.com", "admin");
    await expect(admin.setUserRole(a.id, a.id, "user")).rejects.toThrow(/own admin role/);
  });

  it("setUserRole promotes another user and writes an audit row", async () => {
    const a = await makeUser("admin@test.com", "admin");
    const u = await makeUser("user@test.com");
    await admin.setUserRole(a.id, u.id, "admin");
    const fresh = await db.user.findUnique({ where: { id: u.id } });
    expect(fresh?.role).toBe("admin");
    const audit = await db.auditLog.findFirst({ where: { action: "admin.user.role" } });
    expect(audit?.actorId).toBe(a.id);
  });

  it("setFeatureFlag validates the state value", async () => {
    const a = await makeUser("admin@test.com", "admin");
    await db.featureFlag.create({ data: { key: "test_flag", state: "off" } });
    await expect(admin.setFeatureFlag(a.id, "test_flag", "bogus")).rejects.toThrow();
    await admin.setFeatureFlag(a.id, "test_flag", "beta");
    const f = await db.featureFlag.findUnique({ where: { key: "test_flag" } });
    expect(f?.state).toBe("beta");
  });

  it("upsertOpportunity rejects an invalid slug", async () => {
    const a = await makeUser("admin@test.com", "admin");
    const cat = await db.opportunityCategory.create({ data: { slug: "c", label: "C" } });
    await expect(
      admin.upsertOpportunity(a.id, {
        slug: "Bad Slug!",
        name: "X opportunity",
        categoryId: cat.id,
        summary: "a".repeat(15),
        description: "b".repeat(25),
        difficulty: 3,
        learningCurve: 3,
        competitionLevel: 3,
        scalability: 3,
        demandScore: 3,
        startupCostBand: "lt_50",
        timeCommitment: "1_hr",
        isOnline: true,
        isServiceBased: true,
        beginnerFriendly: false,
        status: "draft",
        revenueModel: "model.",
        monetizationNotes: "notes.",
        riskNotes: "risks.",
        profitFactors: "factors.",
        targetCustomer: "",
      }),
    ).rejects.toThrow();
  });
});

describe("devSetPlan guard", () => {
  it("is blocked in a production-like env", async () => {
    const u = await makeUser("p@test.com");
    const prev = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = "production";
    try {
      await expect(devSetPlan(u.id, "pro")).rejects.toThrow(/disabled/);
    } finally {
      (process.env as Record<string, string>).NODE_ENV = prev ?? "test";
    }
  });

  it("works in dev/test and updates the subscription", async () => {
    const u = await makeUser("d@test.com");
    await devSetPlan(u.id, "premium");
    const sub = await db.subscription.findUnique({ where: { userId: u.id } });
    expect(sub?.plan).toBe("premium");
  });
});
