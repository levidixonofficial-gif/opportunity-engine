import { db } from "@/lib/db";
import { recommendationsFor } from "@/server/services/opportunities";

/** Everything the dashboard needs in one call. */
export async function getDashboardData(userId: string) {
  const [
    todaysTasks,
    completedTasks,
    totalTasks,
    activeProjects,
    revenueAgg,
    expenseAgg,
    leadCount,
    goals,
    selectedSave,
    recommendations,
  ] = await Promise.all([
    db.task.findMany({
      where: { userId, status: "todo" },
      orderBy: [{ dueDate: "asc" }, { sortOrder: "asc" }],
      take: 5,
    }),
    db.task.count({ where: { userId, status: "done" } }),
    db.task.count({ where: { userId } }),
    db.project.count({ where: { userId, status: "active" } }),
    db.transaction.aggregate({ where: { userId, type: "revenue" }, _sum: { amountCents: true } }),
    db.transaction.aggregate({ where: { userId, type: "expense" }, _sum: { amountCents: true } }),
    db.deal.count({ where: { userId, stage: { notIn: ["won", "lost"] } } }),
    db.goal.findMany({ where: { userId, status: "active" }, include: { milestones: true }, take: 3 }),
    db.savedOpportunity.findFirst({
      where: { userId, state: "selected" },
      include: { opportunity: { include: { category: true } } },
    }),
    recommendationsFor(userId, 3),
  ]);

  const revenue = revenueAgg._sum.amountCents ?? 0;
  const expenses = expenseAgg._sum.amountCents ?? 0;

  return {
    todaysTasks,
    progress: {
      completedTasks,
      totalTasks,
      activeProjects,
      leadCount,
      revenueCents: revenue,
      expensesCents: expenses,
      profitCents: revenue - expenses,
    },
    goals,
    currentOpportunity: selectedSave?.opportunity ?? null,
    recommendations,
  };
}
