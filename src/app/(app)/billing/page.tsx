import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserPlan } from "@/server/services/billing";
import { entitlementsFor, PLAN_ENTITLEMENTS } from "@/lib/entitlements";
import { integrations, env } from "@/lib/env";
import { getUsage } from "@/lib/usage";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { UpgradeButton, BillingPortalButton, DevPlanSwitcher } from "./BillingControls";

export const metadata = { title: "Billing" };

const PLAN_COPY: Record<string, { price: string; blurb: string }> = {
  free: { price: "$0", blurb: "Explore and build your first plan." },
  pro: { price: "$19/mo", blurb: "For actively working an opportunity." },
  premium: { price: "$49/mo", blurb: "For running multiple projects." },
};

export default async function BillingPage() {
  const user = await requireUser();
  const [plan, sub, aiUsed, genUsed] = await Promise.all([
    getUserPlan(user.id),
    db.subscription.findUnique({ where: { userId: user.id } }),
    getUsage(user.id, "ai_message"),
    getUsage(user.id, "generator_run"),
  ]);
  const ent = entitlementsFor(plan);
  const devMode = !integrations.stripe && env.NODE_ENV !== "production";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Billing" description="Your plan decides your limits and which tools are unlocked.">
        {sub?.stripeCustomerId && integrations.stripe && <BillingPortalButton />}
      </PageHeader>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current plan</CardTitle>
            <Badge tone={plan === "free" ? "neutral" : "accent"}>{plan}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {sub?.status && sub.status !== "active" && (
            <p className="rounded-md bg-warning-subtle px-3 py-2 text-warning">
              Subscription status: {sub.status}. Entitlements fall back to free until this is resolved.
            </p>
          )}
          <ul className="space-y-1">
            <li>
              AI messages: {aiUsed}
              {ent.limits.aiMessagesPerMonth !== null ? ` / ${ent.limits.aiMessagesPerMonth}` : " (unlimited)"} this month
            </li>
            <li>
              Generator runs: {genUsed}
              {ent.limits.generatorRunsPerMonth !== null ? ` / ${ent.limits.generatorRunsPerMonth}` : " (unlimited)"} this month
            </li>
            <li>Saved opportunities: {ent.limits.savedOpportunities ?? "unlimited"}</li>
            <li>Projects: {ent.limits.projects ?? "unlimited"}</li>
            <li>CRM: {ent.features.crm ? "included" : "not included"}</li>
            <li>Advanced analytics: {ent.features.advanced_analytics ? "included" : "not included"}</li>
            <li>Advanced AI model: {ent.features.advanced_ai ? "included" : "not included"}</li>
          </ul>
          {devMode && (
            <div className="mt-3 rounded-md border border-dashed p-3">
              <DevPlanSwitcher current={plan} />
              <p className="mt-1.5 text-[11px] text-muted-2">
                Local-only shortcut for testing entitlement gates. Disabled in production and once
                Stripe keys are set.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {(["free", "pro", "premium"] as const).map((p) => {
          const e = PLAN_ENTITLEMENTS[p];
          return (
            <Card key={p} className={p === "pro" ? "border-accent" : undefined}>
              <CardHeader>
                <CardTitle className="capitalize">{p}</CardTitle>
                <p className="text-2xl font-semibold">{PLAN_COPY[p].price}</p>
                <p className="text-sm text-muted">{PLAN_COPY[p].blurb}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{e.limits.aiMessagesPerMonth ?? "Unlimited"} AI messages/mo</p>
                <p>{e.limits.projects ?? "Unlimited"} projects</p>
                <p>{e.features.crm ? "CRM included" : "No CRM"}</p>
                <div className="pt-2">
                  {p === "free" ? (
                    <span className="text-xs text-muted">{plan === "free" ? "Current plan" : "Downgrade via Manage billing"}</span>
                  ) : integrations.stripe ? (
                    <UpgradeButton plan={p} current={plan} />
                  ) : (
                    <span className="text-xs text-muted">Checkout enabled once Stripe keys are set (Phase 7 infra).</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted">
        Billing runs on Stripe. Your plan is stored server-side on your subscription record and kept
        in sync by a signed webhook — the browser never decides whether you&apos;ve paid. See{" "}
        <Link href="/pricing" className="underline">pricing</Link> and <code>docs/payments.md</code>.
      </p>
    </div>
  );
}
