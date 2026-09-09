import { beforeEach, describe, expect, it } from "vitest";
import { db, makeUser, resetDb } from "./db";
import * as money from "@/server/services/money";
import * as crm from "@/server/services/crm";
import * as projects from "@/server/services/projects";
import * as plans from "@/server/services/plans";

let uid: string;
beforeEach(async () => {
  await resetDb();
  uid = (await makeUser("svc@test.com")).id;
});

describe("money service", () => {
  it("keeps projected revenue separate from actual", async () => {
    await money.createTransaction(uid, { type: "revenue", amountCents: 10000, currency: "USD", occurredOn: new Date(), isEstimated: false, isRecurring: false });
    await money.createTransaction(uid, { type: "revenue", amountCents: 50000, currency: "USD", occurredOn: new Date(), isEstimated: true, isRecurring: false });
    const s = await money.moneySummary(uid);
    expect(s.revenueActualCents).toBe(10000);
    expect(s.revenueEstimatedCents).toBe(50000);
    expect(s.profitActualCents).toBe(10000);
  });

  it("marking an invoice paid creates a matching actual revenue transaction once", async () => {
    const inv = await money.createInvoice(uid, { number: "INV-1", amountCents: 25000, currency: "USD", status: "draft" });
    await money.markInvoicePaid(uid, inv.id);
    await money.markInvoicePaid(uid, inv.id); // idempotent
    const txns = await db.transaction.findMany({ where: { userId: uid, invoiceId: inv.id } });
    expect(txns).toHaveLength(1);
    expect(txns[0].amountCents).toBe(25000);
    const fresh = await db.invoice.findUnique({ where: { id: inv.id } });
    expect(fresh?.status).toBe("paid");
  });

  it("rejects a transaction linked to another user's project", async () => {
    const other = (await makeUser("other@test.com")).id;
    const p = await projects.createProject(other, { name: "Not yours", status: "active" });
    await expect(
      money.createTransaction(uid, { type: "expense", amountCents: 100, currency: "USD", occurredOn: new Date(), isEstimated: false, isRecurring: false, projectId: p.id }),
    ).rejects.toThrow();
  });
});

describe("crm service", () => {
  it("moving a contact to 'won' flags them as a customer", async () => {
    const c = await crm.createContact(uid, { name: "Prospect", stage: "lead", verificationStatus: "unverified" });
    expect(c.isCustomer).toBe(false);
    const won = await crm.setContactStage(uid, c.id, "won");
    expect(won.isCustomer).toBe(true);
  });

  it("pipeline summary groups value by stage", async () => {
    const a = await crm.createContact(uid, { name: "A", stage: "lead", verificationStatus: "unverified" });
    await crm.createContact(uid, { name: "B", stage: "contacted", verificationStatus: "unverified" });
    await crm.createDeal(uid, { contactId: a.id, title: "Deal A", stage: "lead", valueCents: 5000 });
    const summary = await crm.pipelineSummary(uid);
    const lead = summary.find((s) => s.stage === "lead");
    expect(lead?._sum.valueCents).toBe(5000);
  });

  it("logging interactions advances an activity goal", async () => {
    const { createGoal } = await import("@/server/services/goals");
    const g = await createGoal(uid, { title: "Stay active", metric: "activity", targetValue: 2 });
    const c = await crm.createContact(uid, { name: "C", stage: "lead", verificationStatus: "unverified" });
    await crm.addInteraction(uid, c.id, { type: "call", body: "Left a voicemail" });
    await crm.addInteraction(uid, c.id, { type: "email", body: "Sent a recap" });
    const fresh = await db.goal.findUnique({ where: { id: g.id } });
    expect(fresh?.currentValue).toBe(2);
    expect(fresh?.status).toBe("achieved");
  });
});

describe("plans service", () => {
  it("generating a plan twice for the same opportunity reuses the first", async () => {
    const cat = await db.opportunityCategory.create({ data: { slug: "cat", label: "Cat" } });
    const opp = await db.opportunity.create({
      data: {
        slug: "opp", name: "Opp", categoryId: cat.id, summary: "s", description: "d",
        difficulty: 2, learningCurve: 2, competitionLevel: 2, scalability: 3, demandScore: 3,
        startupCostBand: "lt_50", timeCommitment: "1_hr",
        revenueModel: "m", monetizationNotes: "m", riskNotes: "r", profitFactors: "f",
        steps: { create: [{ sortOrder: 0, title: "Step 1", detail: "do it", phaseLabel: "Week 1" }] },
      },
    });
    const p1 = await plans.generatePlanFromOpportunity(uid, opp.id);
    const p2 = await plans.generatePlanFromOpportunity(uid, opp.id);
    expect(p1.id).toBe(p2.id);
    expect(await db.task.count({ where: { planId: p1.id } })).toBe(1);
  });
});
