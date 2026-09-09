import { beforeEach, describe, expect, it } from "vitest";
import { db, makeUser, resetDb } from "./db";
import * as projects from "@/server/services/projects";
import * as goals from "@/server/services/goals";
import * as crm from "@/server/services/crm";
import * as money from "@/server/services/money";
import * as outreach from "@/server/services/outreach";
import { setTaskStatusFor } from "@/server/services/tasks";

let alice: string;
let bob: string;

beforeEach(async () => {
  await resetDb();
  alice = (await makeUser("alice@test.com")).id;
  bob = (await makeUser("bob@test.com")).id;
});

describe("cross-user data isolation", () => {
  it("Bob cannot read Alice's project", async () => {
    const p = await projects.createProject(alice, { name: "Alice project", status: "idea" });
    expect(await projects.getProject(bob, p.id)).toBeNull();
    expect(await projects.getProject(alice, p.id)).not.toBeNull();
  });

  it("Bob cannot update or delete Alice's project", async () => {
    const p = await projects.createProject(alice, { name: "Alice project", status: "idea" });
    await expect(projects.updateProject(bob, p.id, { name: "hacked" })).rejects.toThrow();
    await expect(projects.setProjectStatus(bob, p.id, "active")).rejects.toThrow();
    await expect(projects.deleteProject(bob, p.id)).rejects.toThrow();
    const still = await db.project.findUnique({ where: { id: p.id } });
    expect(still?.name).toBe("Alice project");
  });

  it("listProjects only returns the caller's rows", async () => {
    await projects.createProject(alice, { name: "Alice only", status: "idea" });
    await projects.createProject(bob, { name: "Bob only", status: "idea" });
    const aList = await projects.listProjects(alice);
    expect(aList).toHaveLength(1);
    expect(aList[0].name).toBe("Alice only");
  });

  it("Bob cannot mutate Alice's goal", async () => {
    const g = await goals.createGoal(alice, { title: "Alice goal", metric: "revenue", targetValue: 10000 });
    await expect(goals.updateGoal(bob, g.id, { title: "x" })).rejects.toThrow();
    await expect(goals.deleteGoal(bob, g.id)).rejects.toThrow();
  });

  it("Bob cannot read or restage Alice's contact/deal", async () => {
    const c = await crm.createContact(alice, { name: "Lead", stage: "lead", verificationStatus: "unverified" });
    expect(await crm.getContact(bob, c.id)).toBeNull();
    await expect(crm.setContactStage(bob, c.id, "won")).rejects.toThrow();
    const d = await crm.createDeal(alice, { contactId: c.id, title: "Deal", stage: "lead", valueCents: 1000 });
    await expect(crm.setDealStage(bob, d.id, "won")).rejects.toThrow();
    await expect(crm.createDeal(bob, { contactId: c.id, title: "x", valueCents: 0, stage: "lead" })).rejects.toThrow();
  });

  it("Bob cannot delete Alice's transaction", async () => {
    const t = await money.createTransaction(alice, {
      type: "revenue",
      amountCents: 5000,
      currency: "USD",
      occurredOn: new Date(),
      isEstimated: false,
      isRecurring: false,
    });
    await expect(money.deleteTransaction(bob, t.id)).rejects.toThrow();
    expect(await db.transaction.findUnique({ where: { id: t.id } })).not.toBeNull();
  });

  it("money summary is per-user", async () => {
    await money.createTransaction(alice, { type: "revenue", amountCents: 10000, currency: "USD", occurredOn: new Date(), isEstimated: false, isRecurring: false });
    await money.createTransaction(bob, { type: "revenue", amountCents: 99999, currency: "USD", occurredOn: new Date(), isEstimated: false, isRecurring: false });
    const s = await money.moneySummary(alice);
    expect(s.revenueActualCents).toBe(10000);
  });

  it("Bob cannot change the status of Alice's outreach draft", async () => {
    const m = await outreach.createOutreach(alice, { channel: "email", kind: "cold_intro", body: "hi" });
    await expect(outreach.setOutreachStatus(bob, m.id, "sent")).rejects.toThrow();
    await expect(outreach.deleteOutreach(bob, m.id)).rejects.toThrow();
  });

  it("Bob cannot complete Alice's task", async () => {
    const p = await projects.createProject(alice, { name: "Alice project", status: "active" });
    const task = await db.task.create({ data: { userId: alice, projectId: p.id, title: "secret task" } });
    await expect(setTaskStatusFor(bob, task.id, "done")).rejects.toThrow();
    const fresh = await db.task.findUnique({ where: { id: task.id } });
    expect(fresh?.status).toBe("todo");
  });
});

describe("goal recompute reflects real data", () => {
  it("revenue goal currentValue tracks transactions", async () => {
    const g = await goals.createGoal(alice, { title: "First $100", metric: "revenue", targetValue: 10000 });
    await money.createTransaction(alice, { type: "revenue", amountCents: 4000, currency: "USD", occurredOn: new Date(), isEstimated: false, isRecurring: false });
    await money.createTransaction(alice, { type: "revenue", amountCents: 7000, currency: "USD", occurredOn: new Date(), isEstimated: false, isRecurring: false });
    const fresh = await db.goal.findUnique({ where: { id: g.id } });
    expect(fresh?.currentValue).toBe(11000);
    expect(fresh?.status).toBe("achieved");
  });
});
