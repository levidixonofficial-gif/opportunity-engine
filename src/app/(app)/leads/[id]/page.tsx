import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getContact } from "@/server/services/crm";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { DEAL_STAGE_LABELS } from "@/lib/validations/enums";
import { ContactControls, InteractionForm, FollowUpForm, DealForm } from "./ContactClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await getContact(user.id, id);
  return { title: c?.name ?? "Contact" };
}

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const contact = await getContact(user.id, id);
  if (!contact) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-2">
        <Link href="/leads" className="text-sm text-muted hover:text-foreground">
          ← Leads
        </Link>
      </div>
      <PageHeader
        title={contact.name}
        description={[contact.title, contact.company].filter(Boolean).join(" · ") || undefined}
      >
        <ContactControls contactId={contact.id} stage={contact.stage} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <InteractionForm contactId={contact.id} />
              <ul className="mt-4 space-y-3">
                {contact.interactions.length === 0 ? (
                  <li className="text-sm text-muted">No activity logged yet.</li>
                ) : (
                  contact.interactions.map((i) => (
                    <li key={i.id} className="border-l-2 pl-3">
                      <p className="text-xs uppercase tracking-wide text-muted">
                        {i.type} · {new Date(i.occurredAt).toLocaleString()}
                      </p>
                      <p className="text-sm">{i.body}</p>
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Deals</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <DealForm contactId={contact.id} />
              <ul className="mt-3 space-y-2">
                {contact.deals.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-md border p-2.5 text-sm">
                    <span>
                      {d.title} · <span className="text-muted">{formatCurrency(d.valueCents)}</span>
                    </span>
                    <Badge>{DEAL_STAGE_LABELS[d.stage as never] ?? d.stage}</Badge>
                  </li>
                ))}
                {contact.deals.length === 0 && <li className="text-sm text-muted">No deals yet.</li>}
              </ul>
            </CardContent>
          </Card>

          {contact.outreach.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Outreach</CardTitle></CardHeader>
              <CardContent className="space-y-2 pt-0 text-sm">
                {contact.outreach.map((m) => (
                  <Link
                    key={m.id}
                    href="/outreach"
                    className="flex items-center justify-between rounded-md border p-2.5 hover:bg-surface-2"
                  >
                    <span className="truncate">{m.subject || m.kind}</span>
                    <Badge>{m.status}</Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <Row label="Email" value={contact.email} />
              <Row label="Phone" value={contact.phone} />
              <Row label="Website" value={contact.website} />
              <Row label="Source" value={contact.sourceDetail ?? contact.source} />
              <Row
                label="Verification"
                value={
                  <Badge tone={contact.verificationStatus === "verified" ? "success" : "neutral"}>
                    {contact.verificationStatus}
                  </Badge>
                }
              />
              {contact.notes && <p className="pt-2 text-muted">{contact.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Schedule follow-up</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <FollowUpForm contactId={contact.id} current={contact.nextFollowUpAt} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  );
}
