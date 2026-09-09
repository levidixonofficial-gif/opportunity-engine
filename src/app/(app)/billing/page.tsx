import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getUserPlan } from "@/server/services/billing";
import { entitlementsFor } from "@/lib/entitlements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);
  const ent = entitlementsFor(plan);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current plan</CardTitle>
            <Badge tone={plan === "free" ? "neutral" : "accent"}>{plan}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted">Your entitlements on this plan:</p>
          <ul className="space-y-1">
            <li>• Saved opportunities: {ent.limits.savedOpportunities ?? "Unlimited"}</li>
            <li>• AI messages / month: {ent.limits.aiMessagesPerMonth ?? "Unlimited"}</li>
            <li>• Plan generations / month: {ent.limits.planGenerationsPerMonth ?? "Unlimited"}</li>
            <li>• Projects: {ent.limits.projects ?? "Unlimited"}</li>
            <li>• CRM: {ent.features.crm ? "Included" : "Not included"}</li>
            <li>• Advanced analytics: {ent.features.advanced_analytics ? "Included" : "Not included"}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Upgrade</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted">
            Stripe checkout and the customer billing portal are implemented in Phase 6. Plan is
            resolved server-side from your subscription record, which a Stripe webhook keeps in sync —
            the app never trusts the browser for paid status.
          </p>
          <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "sm" })}>
            See plan comparison
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
