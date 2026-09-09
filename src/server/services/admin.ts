import { db } from "@/lib/db";
import { z } from "zod";
import { FeatureFlagState, OpportunityStatus, UserRole } from "@/lib/validations/enums";
import { writeAudit } from "@/lib/audit";

/**
 * Admin service. Every function REQUIRES the caller to have already passed
 * `requireAdmin()` — it takes `actorId` only for the audit trail, not for authz.
 */

export async function adminOverview() {
  const [users, admins, opps, published, flags, feedbackNew, recentAudit] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "admin" } }),
    db.opportunity.count(),
    db.opportunity.count({ where: { status: "published" } }),
    db.featureFlag.findMany({ orderBy: { key: "asc" } }),
    db.feedback.count({ where: { status: "new" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { actor: { select: { email: true } } } }),
  ]);
  return { users, admins, opps, published, flags, feedbackNew, recentAudit };
}

export async function setFeatureFlag(actorId: string, key: string, state: string) {
  FeatureFlagState.parse(state);
  const flag = await db.featureFlag.update({ where: { key }, data: { state } });
  await writeAudit({ actorId, action: "admin.flag.set", targetType: "feature_flag", targetId: key, meta: { state } });
  return flag;
}

export async function listAdminOpportunities() {
  return db.opportunity.findMany({
    orderBy: { updatedAt: "desc" },
    include: { category: { select: { label: true } }, _count: { select: { saved: true } } },
  });
}

export const adminOpportunitySchema = z.object({
  slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/, "lowercase, digits, hyphens"),
  name: z.string().trim().min(3).max(120),
  categoryId: z.string().min(1),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().min(20).max(6000),
  difficulty: z.coerce.number().int().min(1).max(5),
  learningCurve: z.coerce.number().int().min(1).max(5),
  competitionLevel: z.coerce.number().int().min(1).max(5),
  scalability: z.coerce.number().int().min(1).max(5),
  demandScore: z.coerce.number().int().min(1).max(5),
  startupCostBand: z.enum(["lt_50", "50_250", "250_1000", "1000_plus"]),
  timeCommitment: z.enum(["30_min", "1_hr", "2_3_hr", "4_plus_hr"]),
  isOnline: z.coerce.boolean(),
  isServiceBased: z.coerce.boolean(),
  beginnerFriendly: z.coerce.boolean(),
  status: OpportunityStatus,
  revenueModel: z.string().trim().min(5).max(1000),
  monetizationNotes: z.string().trim().min(5).max(1000),
  riskNotes: z.string().trim().min(5).max(1000),
  profitFactors: z.string().trim().min(5).max(1000),
  targetCustomer: z.string().trim().max(500).optional().default(""),
});

export async function upsertOpportunity(
  actorId: string,
  input: z.infer<typeof adminOpportunitySchema>,
  id?: string,
) {
  const data = adminOpportunitySchema.parse(input);
  const opp = id
    ? await db.opportunity.update({ where: { id }, data })
    : await db.opportunity.create({ data });
  await writeAudit({
    actorId,
    action: id ? "admin.opportunity.update" : "admin.opportunity.create",
    targetType: "opportunity",
    targetId: opp.id,
  });
  return opp;
}

export async function setUserRole(actorId: string, userId: string, role: string) {
  UserRole.parse(role);
  if (actorId === userId && role !== "admin") {
    throw new Error("You can't remove your own admin role.");
  }
  const user = await db.user.update({ where: { id: userId }, data: { role } });
  await writeAudit({ actorId, action: "admin.user.role", targetType: "user", targetId: userId, meta: { role } });
  return user;
}

export async function listAdminUsers(q?: string) {
  return db.user.findMany({
    where: q ? { email: { contains: q } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { subscription: { select: { plan: true } } },
  });
}
