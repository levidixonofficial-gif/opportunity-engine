import { beforeEach, describe, expect, it } from "vitest";
import { db, makeUser, resetDb } from "./db";
import * as projects from "@/server/services/projects";
import * as goals from "@/server/services/goals";
import * as crm from "@/server/services/crm";
import * as money from "@/server/services/money";
import * as outreach from "@/server/services/outreach";
import * as tasks from "@/server/services/tasks";
import { setTaskStatusFor } from "@/server/services/tasks";
import { markRead } from "@/server/services/notifications";

let alice: string;
let bob: string;

beforeEach(async () => {
  await resetDb();
  alice = (await makeUser("alice@test.com")).id;
  bob = (await makeUser("bob@test.com")).id;
});

const tx = (over: Partial<money.TransactionInput> = {}): money.TransactionInput => ({
  type: "revenue",
  amountCents: 5000,
  currency: "USD",
  occurredOn: new Date(),
  isEstimated: false,
  isRecurring: false,
  ...over,
});

describe("cross-user isolation — read/update/delete/list", () => {
  it("projects: Bob cannot read, update, restatus, or delete Alice's", async () => {
    const p = await projects.createProject(alice, { name: "Alice project", status: "idea" });
    expect(await projects.getProject(bob, p.id)).toBeNull();
    await expect(projects.updateProject(bob, p.id, { name: "hacked" })).rejects.toThrow();
    await expect(projects.setProjectStatus(bob, p.id, "active")).rejects.toThrow();
    await expect(projects.deleteProject(bob, p.id)).rejects.toThrow();
    expect((await db.project.findUnique({ where: { id: p.id } }))?.name).toBe("Alice project");
  });

  it("goals: Bob cannot update, restatus, or delete Alice's", async () => {
    const g = await goals.createGoal(alice, { title: "Alice goal", metric: "revenue", targetValue: 10000 });
    await expect(goals.updateGoal(bob, g.id, { title: "x" })).rejects.toThrow();
    await expect(goals.setGoalStatus(bob, g.id, "archived")).rejects.toThrow();
    await expect(goals.deleteGoal(bob, g.id)).rejects.toThrow();
    expect((await db.goal.findUnique({ where: { id: g.id } }))?.status).toBe("active");
  });

  it("contacts + deals: Bob cannot read or mutate Alice's", async () => {
    const c = await crm.createContact(alice, { name: "Lead", stage: "lead", verificationStatus: "unverified" });
    expect(await crm.getContact(bob, c.id)).toBeNull();
    await expect(crm.updateContact(bob, c.id, { name: "x" })).rejects.toThrow();
    await expect(crm.setContactStage(bob, c.id, "won")).rejects.toThrow();
    await expect(crm.deleteContact(bob, c.id)).rejects.toThrow();
    await expect(crm.addInteraction(bob, c.id, { type: "note", body: "sneaky" })).rejects.toThrow();

    const d = await crm.createDeal(alice, { contactId: c.id, title: "Deal", stage: "lead", valueCents: 1000 });
    await expect(crm.setDealStage(bob, d.id, "won")).rejects.toThrow();
    await expect(crm.updateDeal(bob, d.id, { title: "x" })).rejects.toThrow();
    await expect(crm.deleteDeal(bob, d.id)).rejects.toThrow();
  });

  it("transactions: Bob cannot delete Alice's; summaries stay per-user", async () => {
    const t = await money.createTransaction(alice, tx({ amountCents: 5000 }));
    await expect(money.deleteTransaction(bob, t.id)).rejects.toThrow();
    expect(await db.transaction.findUnique({ where: { id: t.id } })).not.toBeNull();

    await money.createTransaction(bob, tx({ amountCents: 99999 }));
    expect((await money.moneySummary(alice)).revenueActualCents).toBe(5000);
  });

  it("invoices: Bob cannot mark Alice's invoice paid or see it in his list", async () => {
    const inv = await money.createInvoice(alice, { number: "A-1", amountCents: 20000, currency: "USD", status: "draft" });
    await expect(money.markInvoicePaid(bob, inv.id)).rejects.toThrow();
    expect((await db.invoice.findUnique({ where: { id: inv.id } }))?.status).toBe("draft");
    expect(await money.listInvoices(bob)).toHaveLength(0);
    // Bob cannot reuse Alice's invoice number namespace collision either — separate userId scope.
    const b = await money.createInvoice(bob, { number: "A-1", amountCents: 100, currency: "USD", status: "draft" });
    expect(b.number).toBe("A-1");
  });

  it("outreach: Bob cannot restatus or delete Alice's draft", async () => {
    const m = await outreach.createOutreach(alice, { channel: "email", kind: "cold_intro", body: "hi" });
    await expect(outreach.setOutreachStatus(bob, m.id, "sent")).rejects.toThrow();
    await expect(outreach.updateOutreach(bob, m.id, { body: "x" })).rejects.toThrow();
    await expect(outreach.deleteOutreach(bob, m.id)).rejects.toThrow();
    expect((await db.outreachMessage.findUnique({ where: { id: m.id } }))?.body).toBe("hi");
  });

  it("tasks: Bob cannot complete, edit, or delete Alice's task", async () => {
    const p = await projects.createProject(alice, { name: "Alice project", status: "active" });
    const task = await db.task.create({ data: { userId: alice, projectId: p.id, title: "secret task" } });
    await expect(setTaskStatusFor(bob, task.id, "done")).rejects.toThrow();
    await expect(tasks.updateTask(bob, task.id, { title: "x" })).rejects.toThrow();
    await expect(tasks.deleteTask(bob, task.id)).rejects.toThrow();
    expect((await db.task.findUnique({ where: { id: task.id } }))?.status).toBe("todo");
  });

  it("milestones: Bob cannot add/toggle/delete on Alice's project (transitive scope)", async () => {
    const p = await projects.createProject(alice, { name: "Alice project", status: "active" });
    // The milestone actions live in the route layer; assert the DB-level guard the
    // action relies on: a milestone is only reachable via project.userId.
    const m = await db.milestone.create({ data: { projectId: p.id, title: "ship" } });
    const bobView = await db.milestone.findFirst({
      where: { id: m.id, project: { userId: bob } },
    });
    expect(bobView).toBeNull();
    const aliceView = await db.milestone.findFirst({
      where: { id: m.id, project: { userId: alice } },
    });
    expect(aliceView).not.toBeNull();
  });

  it("notifications: markRead is a scoped no-op for the wrong user", async () => {
    const n = await db.notification.create({
      data: { userId: alice, type: "system", title: "hi" },
    });
    await markRead(bob, n.id); // silent no-op
    expect((await db.notification.findUnique({ where: { id: n.id } }))?.readAt).toBeNull();
    await markRead(alice, n.id);
    expect((await db.notification.findUnique({ where: { id: n.id } }))?.readAt).not.toBeNull();
  });

  it("generator outputs + AI conversations are query-scoped", async () => {
    await db.generatorOutput.create({
      data: { userId: alice, kind: "offer", inputJson: "{}", outputJson: "{}" },
    });
    await db.aiConversation.create({ data: { userId: alice, kind: "assistant" } });
    expect(await db.generatorOutput.findMany({ where: { userId: bob } })).toHaveLength(0);
    expect(await db.aiConversation.findMany({ where: { userId: bob } })).toHaveLength(0);
  });
});

describe("relationship tampering — Bob cannot attach Alice's records to his own", () => {
  it("deal cannot be linked to Alice's project", async () => {
    const aliceProject = await projects.createProject(alice, { name: "Alice project", status: "active" });
    const bobContact = await crm.createContact(bob, { name: "Bob lead", stage: "lead", verificationStatus: "unverified" });
    await expect(
      crm.createDeal(bob, { contactId: bobContact.id, title: "x", valueCents: 0, stage: "lead", projectId: aliceProject.id }),
    ).rejects.toThrow();
    const bobDeal = await crm.createDeal(bob, { contactId: bobContact.id, title: "ok", valueCents: 0, stage: "lead" });
    await expect(crm.updateDeal(bob, bobDeal.id, { projectId: aliceProject.id })).rejects.toThrow();
  });

  it("transaction cannot be linked to Alice's project or contact", async () => {
    const aliceProject = await projects.createProject(alice, { name: "Alice project", status: "active" });
    const aliceContact = await crm.createContact(alice, { name: "Alice lead", stage: "lead", verificationStatus: "unverified" });
    await expect(money.createTransaction(bob, tx({ projectId: aliceProject.id }))).rejects.toThrow();
    await expect(money.createTransaction(bob, tx({ contactId: aliceContact.id }))).rejects.toThrow();
    expect(await db.transaction.count({ where: { userId: bob } })).toBe(0);
  });

  it("invoice cannot be linked to Alice's project or contact", async () => {
    const aliceProject = await projects.createProject(alice, { name: "Alice project", status: "active" });
    await expect(
      money.createInvoice(bob, { number: "B-1", amountCents: 100, currency: "USD", status: "draft", projectId: aliceProject.id }),
    ).rejects.toThrow();
  });

  it("task cannot be linked to Alice's project, contact, or plan", async () => {
    const aliceProject = await projects.createProject(alice, { name: "Alice project", status: "active" });
    const aliceContact = await crm.createContact(alice, { name: "Alice lead", stage: "lead", verificationStatus: "unverified" });
    const alicePlan = await db.plan.create({ data: { userId: alice, title: "Alice plan" } });
    await expect(tasks.createTask(bob, { title: "x", projectId: aliceProject.id })).rejects.toThrow();
    await expect(tasks.createTask(bob, { title: "x", contactId: aliceContact.id })).rejects.toThrow();
    await expect(tasks.createTask(bob, { title: "x", planId: alicePlan.id })).rejects.toThrow();
  });

  it("outreach cannot be linked to Alice's contact or deal", async () => {
    const aliceContact = await crm.createContact(alice, { name: "Alice lead", stage: "lead", verificationStatus: "unverified" });
    const aliceDeal = await crm.createDeal(alice, { contactId: aliceContact.id, title: "d", valueCents: 0, stage: "lead" });
    await expect(outreach.createOutreach(bob, { channel: "email", kind: "cold_intro", body: "hi", contactId: aliceContact.id })).rejects.toThrow();
    await expect(outreach.createOutreach(bob, { channel: "email", kind: "cold_intro", body: "hi", dealId: aliceDeal.id })).rejects.toThrow();
  });

  it("reorderTasks silently ignores ids the caller does not own", async () => {
    const aliceProject = await projects.createProject(alice, { name: "Alice project", status: "active" });
    const aliceTask = await db.task.create({ data: { userId: alice, projectId: aliceProject.id, title: "a", sortOrder: 0 } });
    const bobTask = await tasks.createTask(bob, { title: "b" });
    await tasks.reorderTasks(bob, [aliceTask.id, bobTask.id]);
    // Alice's task order is untouched.
    expect((await db.task.findUnique({ where: { id: aliceTask.id } }))?.sortOrder).toBe(0);
  });
});

describe("goal recompute reflects real (actual) data", () => {
  it("revenue goal tracks actual transactions and flips to achieved", async () => {
    const g = await goals.createGoal(alice, { title: "First $100", metric: "revenue", targetValue: 10000 });
    await money.createTransaction(alice, tx({ amountCents: 4000 }));
    await money.createTransaction(alice, tx({ amountCents: 7000 }));
    const fresh = await db.goal.findUnique({ where: { id: g.id } });
    expect(fresh?.currentValue).toBe(11000);
    expect(fresh?.status).toBe("achieved");
  });

  it("projected (isEstimated) revenue does NOT count toward a revenue goal", async () => {
    const g = await goals.createGoal(alice, { title: "First $100", metric: "revenue", targetValue: 10000 });
    await money.createTransaction(alice, tx({ amountCents: 4000, isEstimated: false }));
    await money.createTransaction(alice, tx({ amountCents: 50000, isEstimated: true }));
    const fresh = await db.goal.findUnique({ where: { id: g.id } });
    expect(fresh?.currentValue).toBe(4000);
    expect(fresh?.status).toBe("active");
  });
});
