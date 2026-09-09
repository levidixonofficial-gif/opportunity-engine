import { db } from "@/lib/db";
import { GoalMetric, GoalStatus } from "@/lib/validations/enums";
import { NotFoundError } from "@/lib/errors";
import { z } from "zod";

export const goalInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  metric: GoalMetric.default("revenue"),
  targetValue: z.number().int().positive(),
  targetDate: z.coerce.date().optional().nullable(),
});
export type GoalInput = z.infer<typeof goalInputSchema>;

export async function listGoals(userId: string) {
  return db.goal.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { milestones: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function createGoal(userId: string, input: GoalInput) {
  const data = goalInputSchema.parse(input);
  const goal = await db.goal.create({
    data: {
      userId,
      title: data.title,
      metric: data.metric,
      targetValue: data.targetValue,
      targetDate: data.targetDate ?? null,
    },
  });
  await recomputeGoal(userId, goal.id);
  return goal;
}

export async function updateGoal(userId: string, id: string, input: Partial<GoalInput>) {
  const owned = await db.goal.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new NotFoundError("That goal");
  const data = goalInputSchema.partial().parse(input);
  const goal = await db.goal.update({ where: { id }, data });
  await recomputeGoal(userId, id);
  return goal;
}

export async function setGoalStatus(userId: string, id: string, status: z.infer<typeof GoalStatus>) {
  GoalStatus.parse(status);
  const owned = await db.goal.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new NotFoundError("That goal");
  return db.goal.update({ where: { id }, data: { status } });
}

export async function deleteGoal(userId: string, id: string) {
  const owned = await db.goal.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new NotFoundError("That goal");
  await db.goal.delete({ where: { id } });
}

/** Derive a goal's currentValue from the user's real data for its metric. */
export async function recomputeGoal(userId: string, goalId: string) {
  const goal = await db.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) return;

  let current = goal.currentValue;
  switch (goal.metric) {
    case "revenue": {
      // Only ACTUAL money counts toward a revenue goal — projections do not.
      const agg = await db.transaction.aggregate({
        where: { userId, type: "revenue", isEstimated: false },
        _sum: { amountCents: true },
      });
      current = agg._sum.amountCents ?? 0;
      break;
    }
    case "profit": {
      const [rev, exp] = await Promise.all([
        db.transaction.aggregate({ where: { userId, type: "revenue", isEstimated: false }, _sum: { amountCents: true } }),
        db.transaction.aggregate({ where: { userId, type: "expense", isEstimated: false }, _sum: { amountCents: true } }),
      ]);
      current = (rev._sum.amountCents ?? 0) - (exp._sum.amountCents ?? 0);
      break;
    }
    case "leads":
      current = await db.contact.count({ where: { userId } });
      break;
    case "customers":
      current = await db.contact.count({ where: { userId, isCustomer: true } });
      break;
    case "projects":
      current = await db.project.count({ where: { userId, status: "completed" } });
      break;
    case "tasks":
      current = await db.task.count({ where: { userId, status: "done" } });
      break;
    case "activity":
      current = await db.interaction.count({ where: { userId } });
      break;
    default:
      break; // custom: user-updated only
  }

  const nowAchieved = current >= goal.targetValue && goal.status === "active";
  await db.goal.update({
    where: { id: goalId },
    data: {
      currentValue: current,
      status: nowAchieved ? "achieved" : goal.status,
    },
  });

  if (nowAchieved) {
    await db.notification.create({
      data: {
        userId,
        type: "milestone",
        title: "Goal reached 🎯",
        body: `"${goal.title}" — nice work.`,
        actionUrl: "/goals",
      },
    });
  }
}

export async function recomputeGoalsForMetric(
  userId: string,
  metrics: z.infer<typeof GoalMetric>[],
) {
  const goals = await db.goal.findMany({
    where: { userId, status: "active", metric: { in: metrics } },
    select: { id: true },
  });
  await Promise.all(goals.map((g) => recomputeGoal(userId, g.id)));
}
