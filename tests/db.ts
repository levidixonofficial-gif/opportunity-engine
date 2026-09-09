import { db } from "@/lib/db";

/** Order matters: children before parents (FK). */
const TABLES = [
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
  "SavedOpportunity",
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
  "FeatureFlagOverride",
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
