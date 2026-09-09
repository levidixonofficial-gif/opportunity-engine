import Link from "next/link";
import { PLAN_ENTITLEMENTS } from "@/lib/entitlements";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";

export const metadata = { title: "Pricing" };

const COPY: Record<string, { price: string; blurb: string; highlights: string[] }> = {
  free: {
    price: "$0",
    blurb: "Explore the library and build your first plan.",
    highlights: ["5 saved opportunities", "1 execution plan", "Basic progress tracking"],
  },
  pro: {
    price: "$19/mo",
    blurb: "For people actively working an opportunity.",
    highlights: ["Unlimited opportunities & plans", "AI assistant + generators", "CRM & money tracking", "Advanced analytics"],
  },
  premium: {
    price: "$49/mo",
    blurb: "For operators running multiple projects.",
    highlights: ["Everything in Pro", "Highest AI limits & advanced model", "Priority semantic research", "Exports"],
  },
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-2 max-w-xl text-muted">
        Billing goes live in a later phase. Limits below are what each plan will grant.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {(["free", "pro", "premium"] as const).map((plan) => {
          const ent = PLAN_ENTITLEMENTS[plan];
          const c = COPY[plan];
          return (
            <Card key={plan} className={plan === "pro" ? "border-accent" : undefined}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="capitalize">{plan}</CardTitle>
                  {plan === "pro" && <Badge tone="accent">Popular</Badge>}
                </div>
                <p className="text-2xl font-semibold">{c.price}</p>
                <p className="text-sm text-muted">{c.blurb}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {c.highlights.map((h) => (
                  <p key={h}>• {h}</p>
                ))}
                <p className="pt-2 text-xs text-muted">
                  AI messages/mo: {ent.limits.aiMessagesPerMonth ?? "Unlimited"} · Projects:{" "}
                  {ent.limits.projects ?? "Unlimited"}
                </p>
                <Link href="/sign-in" className={buttonVariants({ variant: plan === "pro" ? "primary" : "outline" }) + " mt-3 w-full"}>
                  Get started
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
