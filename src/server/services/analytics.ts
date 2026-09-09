import { db } from "@/lib/db";

/** Personal performance metrics derived entirely from the user's own rows. */
export async function getPersonalAnalytics(userId: string) {
  const [
    savedCount,
    selectedCount,
    planCount,
    tasksDone,
    tasksTotal,
    projectsActive,
    projectsCompleted,
    contacts,
    customers,
    dealsWon,
    revenue,
    expenses,
    interactionsByDay,
    tasksByDay,
    generatorRuns,
    aiMessages,
  ] = await Promise.all([
    db.savedOpportunity.count({ where: { userId } }),
    db.savedOpportunity.count({ where: { userId, state: "selected" } }),
    db.plan.count({ where: { userId } }),
    db.task.count({ where: { userId, status: "done" } }),
    db.task.count({ where: { userId } }),
    db.project.count({ where: { userId, status: "active" } }),
    db.project.count({ where: { userId, status: "completed" } }),
    db.contact.count({ where: { userId } }),
    db.contact.count({ where: { userId, isCustomer: true } }),
    db.deal.count({ where: { userId, stage: "won" } }),
    db.transaction.aggregate({ where: { userId, type: "revenue", isEstimated: false }, _sum: { amountCents: true } }),
    db.transaction.aggregate({ where: { userId, type: "expense", isEstimated: false }, _sum: { amountCents: true } }),
    db.interaction.findMany({ where: { userId }, select: { occurredAt: true } }),
    db.task.findMany({ where: { userId, status: "done", completedAt: { not: null } }, select: { completedAt: true } }),
    db.generatorOutput.count({ where: { userId } }),
    db.aiMessage.count({ where: { conversation: { userId }, role: "user" } }),
  ]);

  // Activity streak: consecutive days (ending today or yesterday) with an interaction or completed task.
  const days = new Set<string>();
  for (const i of interactionsByDay) days.add(dayKey(i.occurredAt));
  for (const t of tasksByDay) if (t.completedAt) days.add(dayKey(t.completedAt));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  // last 14 days completed-task counts
  const last14: { day: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = dayKey(d);
    last14.push({
      day: key.slice(5),
      count: tasksByDay.filter((t) => t.completedAt && dayKey(t.completedAt) === key).length,
    });
  }

  return {
    funnel: [
      { label: "Opportunities saved", value: savedCount },
      { label: "Selected a focus", value: selectedCount },
      { label: "Generated a plan", value: planCount },
      { label: "Completed a task", value: tasksDone > 0 ? 1 : 0 },
      { label: "Logged revenue", value: (revenue._sum.amountCents ?? 0) > 0 ? 1 : 0 },
    ],
    totals: {
      tasksDone,
      tasksTotal,
      projectsActive,
      projectsCompleted,
      contacts,
      customers,
      dealsWon,
      revenueCents: revenue._sum.amountCents ?? 0,
      profitCents: (revenue._sum.amountCents ?? 0) - (expenses._sum.amountCents ?? 0),
      generatorRuns,
      aiMessages,
    },
    streak,
    tasksLast14: last14,
  };
}

function dayKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
