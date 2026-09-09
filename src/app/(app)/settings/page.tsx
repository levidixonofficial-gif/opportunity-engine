import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getScorerProfile } from "@/server/services/profile";
import { BUDGET_LABELS, GOAL_LABELS, TIME_LABELS } from "@/lib/validations/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateNotificationPrefs, resetOnboarding } from "./actions";

export const metadata = { title: "Settings" };

const PREFS: { name: string; label: string }[] = [
  { name: "recommendations", label: "New recommended opportunities" },
  { name: "taskReminders", label: "Task reminders" },
  { name: "weeklyDigest", label: "Weekly progress summary" },
  { name: "billingAlerts", label: "Billing & payment alerts" },
  { name: "productUpdates", label: "Product updates" },
];

export default async function SettingsPage() {
  const user = await requireUser();
  const [pref, profile, scorer] = await Promise.all([
    db.notificationPreference.findUnique({ where: { userId: user.id } }),
    db.profile.findUnique({ where: { userId: user.id } }),
    getScorerProfile(user.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-muted">Name:</span> {user.name ?? "—"}</p>
          <p><span className="text-muted">Email:</span> {user.email}</p>
          <p><span className="text-muted">Role:</span> {user.role}</p>
          <p className="text-xs text-muted">
            Account identity is managed by the auth provider (Clerk in production). Email and name
            changes happen there.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your profile</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-muted">Goal:</span> {profile?.primaryGoal ? GOAL_LABELS[profile.primaryGoal as keyof typeof GOAL_LABELS] : "—"}</p>
          <p><span className="text-muted">Budget:</span> {profile?.budgetBand ? BUDGET_LABELS[profile.budgetBand as keyof typeof BUDGET_LABELS] : "—"}</p>
          <p><span className="text-muted">Time:</span> {profile?.timeBand ? TIME_LABELS[profile.timeBand as keyof typeof TIME_LABELS] : "—"}</p>
          <p><span className="text-muted">Skills:</span> {scorer.skillSlugs.join(", ") || "—"}</p>
          <p><span className="text-muted">Interests:</span> {scorer.interestSlugs.join(", ") || "—"}</p>
          <form action={resetOnboarding} className="pt-2">
            <Button type="submit" variant="outline" size="sm">Redo onboarding</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent>
          <form action={updateNotificationPrefs} className="space-y-3">
            {PREFS.map((p) => {
              const current = pref ? (pref[p.name as keyof typeof pref] as boolean) : true;
              return (
                <label key={p.name} className="flex items-center justify-between text-sm">
                  {p.label}
                  <input type="checkbox" name={p.name} defaultChecked={current} className="size-4 rounded border" />
                </label>
              );
            })}
            <Button type="submit" size="sm">Save preferences</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
