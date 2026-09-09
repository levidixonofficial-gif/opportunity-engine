import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getUserPlan } from "@/server/services/billing";
import { hasFeature } from "@/lib/entitlements";
import { listContacts, pipelineSummary, dueFollowUps } from "@/server/services/crm";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { DEAL_STAGE_LABELS } from "@/lib/validations/enums";
import { NewContactButton, ImportLeadsButton } from "./LeadDialogs";
import { PipelineBoard, PipelineValueBar } from "./PipelineBoard";

export const metadata = { title: "Leads" };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const plan = await getUserPlan(user.id);
  const crmEnabled = hasFeature(plan, "crm");

  const [contacts, summary, followUps] = await Promise.all([
    listContacts(user.id, { q: sp.q }),
    pipelineSummary(user.id),
    dueFollowUps(user.id),
  ]);

  const view = sp.view === "list" ? "list" : "board";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Leads" description="A lightweight CRM for whatever opportunity you're working. Bring your own lists — we never scrape.">
        <ImportLeadsButton />
        <NewContactButton />
      </PageHeader>

      {!crmEnabled && (
        <Card className="mb-4 border-warning/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-4 text-sm">
            <span className="text-muted">
              The CRM is a Pro feature. It works fully in this build; billing enforcement lands in
              Phase 6.
            </span>
            <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
              See plans
            </Link>
          </CardContent>
        </Card>
      )}

      {followUps.length > 0 && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <p className="text-sm font-medium">Follow-ups due</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {followUps.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <Link href={`/leads/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                  <span className="text-muted">
                    {c.nextFollowUpAt ? new Date(c.nextFollowUpAt).toLocaleDateString() : ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {contacts.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          description="Add a contact you're already talking to, or import a list you own."
          action={<NewContactButton />}
        />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <PipelineValueBar summary={summary} />
            <div className="flex rounded-md border bg-surface p-0.5 text-sm">
              <Link
                href="/leads?view=board"
                className={`rounded px-2.5 py-1 ${view === "board" ? "bg-surface-3" : "text-muted"}`}
              >
                Board
              </Link>
              <Link
                href="/leads?view=list"
                className={`rounded px-2.5 py-1 ${view === "list" ? "bg-surface-3" : "text-muted"}`}
              >
                List
              </Link>
            </div>
          </div>

          {view === "board" ? (
            <PipelineBoard contacts={contacts} />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto"><table className="w-full min-w-[32rem] text-sm">
                  <thead className="border-b text-left text-xs text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">Name</th>
                      <th scope="col" className="px-4 py-2 font-medium">Company</th>
                      <th scope="col" className="px-4 py-2 font-medium">Stage</th>
                      <th scope="col" className="px-4 py-2 font-medium">Next follow-up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {contacts.map((c) => (
                      <tr key={c.id} className="hover:bg-surface-2">
                        <td className="px-4 py-2.5">
                          <Link href={`/leads/${c.id}`} className="font-medium hover:underline">
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-muted">{c.company ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          <Badge>{DEAL_STAGE_LABELS[c.stage as never] ?? c.stage}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted">
                          {c.nextFollowUpAt ? new Date(c.nextFollowUpAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
