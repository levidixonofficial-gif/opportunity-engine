import { beforeEach, describe, expect, it } from "vitest";
import { db, makeUser, resetDb } from "./db";
import * as money from "@/server/services/money";
import * as crm from "@/server/services/crm";
import * as plans from "@/server/services/plans";
import { importLeads, parseCsv } from "@/server/services/leads";
import { consumeUsage, getUsage } from "@/lib/usage";
import { LimitReachedError } from "@/lib/errors";
import { sanitizeImportedCell } from "@/lib/db-helpers";

let uid: string;
beforeEach(async () => {
  await resetDb();
  uid = (await makeUser("integrity@test.com")).id;
});

async function seedOpportunity(slug = "opp") {
  const cat = await db.opportunityCategory.upsert({
    where: { slug: "c" },
    update: {},
    create: { slug: "c", label: "C" },
  });
  return db.opportunity.create({
    data: {
      slug,
      name: "Opp",
      categoryId: cat.id,
      summary: "s",
      description: "d",
      difficulty: 2,
      learningCurve: 2,
      competitionLevel: 2,
      scalability: 3,
      demandScore: 3,
      startupCostBand: "lt_50",
      timeCommitment: "1_hr",
      revenueModel: "m",
      monetizationNotes: "m",
      riskNotes: "r",
      profitFactors: "f",
      status: "published",
      steps: { create: [{ sortOrder: 0, title: "Step", detail: "do", phaseLabel: "Week 1" }] },
    },
  });
}

describe("usage counters cannot be bypassed", () => {
  it("consumeUsage increments then blocks past the plan limit, and refunds on release(false)", async () => {
    // free plan: aiMessagesPerMonth = 15
    for (let i = 0; i < 15; i++) {
      const u = await consumeUsage(uid, "ai_message");
      await u.release(true);
    }
    expect(await getUsage(uid, "ai_message")).toBe(15);
    await expect(consumeUsage(uid, "ai_message")).rejects.toBeInstanceOf(LimitReachedError);
    // the over-limit attempt was refunded — counter is still exactly 15
    expect(await getUsage(uid, "ai_message")).toBe(15);
  });

  it("release(false) refunds a unit so a failed operation does not burn quota", async () => {
    const u = await consumeUsage(uid, "generator_run");
    expect(await getUsage(uid, "generator_run")).toBe(1);
    await u.release(false);
    expect(await getUsage(uid, "generator_run")).toBe(0);
  });

  it("concurrent consumes never exceed the limit", async () => {
    // free plan generatorRunsPerMonth = 5; fire 20 at once
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => consumeUsage(uid, "generator_run").then((u) => u.release(true))),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    expect(ok).toBe(5);
    expect(await getUsage(uid, "generator_run")).toBe(5);
  });
});

describe("plan generation entitlement", () => {
  it("free plan can generate 1 plan/month; a 2nd distinct opportunity is blocked", async () => {
    const a = await seedOpportunity("opp-a");
    const b = await seedOpportunity("opp-b");
    await plans.generatePlanFromOpportunity(uid, a.id);
    await expect(plans.generatePlanFromOpportunity(uid, b.id)).rejects.toBeInstanceOf(LimitReachedError);
    expect(await getUsage(uid, "plan_generation")).toBe(1);
  });

  it("reusing an existing active plan does not consume quota", async () => {
    const a = await seedOpportunity("opp-a");
    const p1 = await plans.generatePlanFromOpportunity(uid, a.id);
    const p2 = await plans.generatePlanFromOpportunity(uid, a.id);
    expect(p1.id).toBe(p2.id);
    expect(await getUsage(uid, "plan_generation")).toBe(1);
  });

  it("a draft/archived opportunity cannot be turned into a plan", async () => {
    const cat = await db.opportunityCategory.upsert({ where: { slug: "c" }, update: {}, create: { slug: "c", label: "C" } });
    const draft = await db.opportunity.create({
      data: {
        slug: "draft",
        name: "Draft",
        categoryId: cat.id,
        summary: "s",
        description: "d",
        difficulty: 2,
        learningCurve: 2,
        competitionLevel: 2,
        scalability: 2,
        demandScore: 2,
        startupCostBand: "lt_50",
        timeCommitment: "1_hr",
        revenueModel: "m",
        monetizationNotes: "m",
        riskNotes: "r",
        profitFactors: "f",
        status: "draft",
      },
    });
    await expect(plans.generatePlanFromOpportunity(uid, draft.id)).rejects.toThrow();
  });
});

describe("invoice -> revenue is idempotent and race-safe", () => {
  it("many concurrent markInvoicePaid create exactly one transaction", async () => {
    const inv = await money.createInvoice(uid, { number: "INV-1", amountCents: 30000, currency: "USD", status: "draft" });
    await Promise.allSettled(Array.from({ length: 8 }, () => money.markInvoicePaid(uid, inv.id)));
    const txns = await db.transaction.findMany({ where: { userId: uid, invoiceId: inv.id } });
    expect(txns).toHaveLength(1);
    expect(txns[0].amountCents).toBe(30000);
    expect((await db.invoice.findUnique({ where: { id: inv.id } }))?.status).toBe("paid");
  });
});

describe("CSV import safety", () => {
  it("sanitizeImportedCell neutralises formula-leading cells", () => {
    expect(sanitizeImportedCell("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(sanitizeImportedCell("+1-408-555")).toBe("'+1-408-555");
    expect(sanitizeImportedCell("@cmd")).toBe("'@cmd");
    expect(sanitizeImportedCell("-2")).toBe("'-2");
    expect(sanitizeImportedCell("Acme Corp")).toBe("Acme Corp");
    expect(sanitizeImportedCell("")).toBe("");
  });

  it("importLeads stores formula-prefixed values, dedupes by email, marks unverified", async () => {
    const csv = 'name,email,company\n"=cmd|calc",a@x.com,Acme\nJane,a@x.com,Dup\nBob,b@x.com,"@evil"';
    const { rows } = parseCsv(csv);
    const mapped = rows
      .map((r) => ({ name: r.name, email: r.email, company: r.company }))
      .filter((r) => r.name.length > 0);
    const res = await importLeads(uid, { source: "csv", rows: mapped });
    expect(res.imported).toBe(2);
    expect(res.skipped).toBe(1);
    const contacts = await db.contact.findMany({ where: { userId: uid }, orderBy: { name: "asc" } });
    const evil = contacts.find((c) => c.email === "a@x.com");
    expect(evil?.name.startsWith("'=")).toBe(true);
    const bob = contacts.find((c) => c.email === "b@x.com");
    expect(bob?.company?.startsWith("'@")).toBe(true);
    expect(contacts.every((c) => c.verificationStatus === "unverified")).toBe(true);
    expect(contacts.every((c) => c.source === "import")).toBe(true);
  });

  it("parseCsv rejects a body with no data rows", () => {
    expect(parseCsv("name,email").error).toBeTruthy();
  });
});

describe("deleting a contact keeps the money it earned", () => {
  it("revenue transactions survive contact deletion (unlinked, not deleted)", async () => {
    const c = await crm.createContact(uid, { name: "Payer", stage: "won", verificationStatus: "verified" });
    const t = await money.createTransaction(uid, {
      type: "revenue",
      amountCents: 12345,
      currency: "USD",
      occurredOn: new Date(),
      isEstimated: false,
      isRecurring: false,
      contactId: c.id,
    });
    await crm.deleteContact(uid, c.id);
    const fresh = await db.transaction.findUnique({ where: { id: t.id } });
    expect(fresh).not.toBeNull();
    expect(fresh?.contactId).toBeNull();
    expect(fresh?.amountCents).toBe(12345);
  });
});
