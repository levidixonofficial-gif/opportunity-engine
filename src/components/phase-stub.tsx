import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";

/**
 * Honest placeholder for features that are designed and scheduled but not yet
 * implemented (spec §52: no fake functionality). Every stub names its phase.
 */
export function PhaseStub({
  title,
  phase,
  description,
  bullets,
}: {
  title: string;
  phase: string;
  description: string;
  bullets: string[];
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Badge tone="warning">{phase}</Badge>
      </div>
      <Card>
        <CardContent className="space-y-4 pt-5">
          <p className="text-sm text-muted">{description}</p>
          <ul className="space-y-1 text-sm">
            {bullets.map((b) => (
              <li key={b}>• {b}</li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            This screen is intentionally not wired up yet. The data model, service layer, and
            entitlements for it already exist — see docs/roadmap.md.
          </p>
          <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
