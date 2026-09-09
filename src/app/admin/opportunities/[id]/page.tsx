import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { OpportunityForm } from "./OpportunityForm";

export const metadata = { title: "Admin · Edit opportunity" };

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";

  const [opp, categories] = await Promise.all([
    isNew ? null : db.opportunity.findUnique({ where: { id } }),
    db.opportunityCategory.findMany({ orderBy: { label: "asc" } }),
  ]);
  if (!isNew && !opp) notFound();

  return (
    <div>
      <Link href="/admin/opportunities" className="text-sm text-muted hover:text-foreground">
        ← All opportunities
      </Link>
      <h2 className="mb-4 mt-2 text-xl font-semibold tracking-tight">
        {isNew ? "New opportunity" : `Edit: ${opp!.name}`}
      </h2>
      <OpportunityForm
        categories={categories.map((c) => ({ id: c.id, label: c.label }))}
        opportunity={opp ? JSON.parse(JSON.stringify(opp)) : null}
      />
    </div>
  );
}
