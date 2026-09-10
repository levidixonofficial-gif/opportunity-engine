import { db } from "@/lib/db";

/** Order matters: children before parents (PostgreSQL enforces every FK). */
const TABLES = [
  "WebhookEvent",
  "AuditLog",
  "Feedback",
  "GeneratorOutput",
  "AiMessage",
  "AiConversation",
  "OutreachMessage",
  "Interaction",
  "Deal",
  "Transaction",
  "Invoice",
  "Milestone",
  "Task",
  "Plan",
  "Project",
  "Goal",
  "OpportunityStep",
  "OpportunityTool",
  "OpportunityExample",
  "OpportunitySkill",
  "OpportunityInterest",
  "SavedOpportunity",
  "Opportunity",
  "OpportunityCategory",
  "Contact",
  "LeadImportBatch",
  "Company",
  "UsageCounter",
  "Notification",
  "NotificationPreference",
  "Subscription",
  "Attribution",
  "ProfileSkill",
  "ProfileInterest",
  "Profile",
  "Skill",
  "Interest",
  "FeatureFlagOverride",
  "FeatureFlag",
  "KnowledgeDocument",
  "User",
];

export async function resetDb() {
  for (const t of TABLES) {
    await db.$executeRawUnsafe(`DELETE FROM "${t}"`);
  }
}

export async function makeUser(email: string, role: "user" | "admin" = "user") {
  return db.user.create({
    data: {
      clerkId: `test_${email}`,
      email,
      role,
      subscription: { create: {} },
      notificationPref: { create: {} },
      profile: { create: { onboardedAt: new Date() } },
    },
  });
}

export { db };
