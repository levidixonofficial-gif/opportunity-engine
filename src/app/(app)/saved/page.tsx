import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { SaveButton } from "../opportunities/SaveButton";

export const metadata = { title: "Saved" };

export default async function SavedPage() {
  const user = await requireUser();
  const rows = await db.savedOpportunity.findMany({
    where: { userId: user.id },
    orderBy: [{ state: "asc" }, { fitScore: "desc" }],
    include: { opportunity: { include: { category: true } } },
  });

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Saved</h1>
        <EmptyState
          title="Nothing saved yet"
          description="Save opportunities you're considering so you can compare them side by side."
          action={<Link href="/opportunities" className={buttonVariants({ size: "sm" })}>Browse opportunities</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Saved</h1>
      {rows.map((row) => {
        const reasons: string[] = row.fitReasons ? JSON.parse(row.fitReasons) : [];
        return (
          <Card key={row.id}>
            <CardContent className="space-y-2 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge>{row.opportunity.category.label}</Badge>
                  {row.state === "selected" && <Badge tone="accent" className="ml-2">Current focus</Badge>}
                  <Link
                    href={`/opportunities/${row.opportunity.slug}`}
                    className="mt-2 block font-semibold hover:underline"
                  >
                    {row.opportunity.name}
                  </Link>
                </div>
                {row.fitScore != null && <span className="text-lg font-semibold text-accent">{row.fitScore}</span>}
              </div>
              <p className="text-sm text-muted">{row.opportunity.summary}</p>
              {reasons.length > 0 && <p className="text-xs text-muted">Why: {reasons.join(" · ")}</p>}
              <SaveButton opportunityId={row.opportunityId} initialSaved />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
