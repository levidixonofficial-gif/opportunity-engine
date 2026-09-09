import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listTransactions, moneySummary, listInvoices } from "@/server/services/money";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { MonthlyBars } from "@/components/ui/charts";
import { AddTransactionButton, NewInvoiceButton } from "./MoneyDialogs";
import { TxRowActions, InvoiceRowActions } from "./RowActions";

export const metadata = { title: "Money" };

export default async function MoneyPage() {
  const user = await requireUser();
  const [summary, transactions, invoices, projects, contacts, projectNames] = await Promise.all([
    moneySummary(user.id),
    listTransactions(user.id, { limit: 60 }),
    listInvoices(user.id),
    db.project.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
    db.contact.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
    db.project.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
  ]);

  const projMap = new Map(projectNames.map((p) => [p.id, p.name]));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Money"
        description="Track revenue and expenses. Projections are kept separate from money that has actually moved."
      >
        <NewInvoiceButton projects={projects} contacts={contacts} />
        <AddTransactionButton projects={projects} contacts={contacts} />
      </PageHeader>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Revenue (actual)" value={formatCurrency(summary.revenueActualCents)} />
        <Stat label="Expenses (actual)" value={formatCurrency(summary.expenseActualCents)} />
        <Stat label="Profit (actual)" value={formatCurrency(summary.profitActualCents)} />
        <Stat
          label="Projected revenue"
          value={formatCurrency(summary.revenueEstimatedCents)}
          sub="not yet received"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Monthly (actual)</CardTitle></CardHeader>
          <CardContent>
            <MonthlyBars data={summary.byMonth} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Revenue by project</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {summary.byProject.length === 0 ? (
              <p className="text-muted">No project-linked revenue yet.</p>
            ) : (
              summary.byProject.map((p) => (
                <div key={p.projectId} className="flex justify-between">
                  <span className="truncate">{projMap.get(p.projectId!) ?? "—"}</span>
                  <span>{formatCurrency(p.revenueCents)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No entries yet" description="Add your first revenue or expense to start tracking." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium">Linked</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-2">
                    <td className="px-4 py-2.5 text-muted">{t.occurredOn.toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={t.type === "revenue" ? "success" : "danger"}>{t.type}</Badge>
                      {t.isEstimated && <span className="ml-1 text-[10px] text-muted">est.</span>}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{formatCurrency(t.amountCents)}</td>
                    <td className="px-4 py-2.5 text-muted">{t.category ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted">
                      {t.project?.name ?? t.contact?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <TxRowActions id={t.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {invoices.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Number</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-2">
                    <td className="px-4 py-2.5">{inv.number}</td>
                    <td className="px-4 py-2.5 text-muted">{inv.contact?.name ?? inv.project?.name ?? "—"}</td>
                    <td className="px-4 py-2.5 font-medium">{formatCurrency(inv.amountCents)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={inv.status === "paid" ? "success" : inv.status === "void" ? "neutral" : "warning"}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {inv.status !== "paid" && inv.status !== "void" && <InvoiceRowActions id={inv.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 text-lg font-semibold">{value}</p>
        {sub && <p className="text-[11px] text-muted-2">{sub}</p>}
      </CardContent>
    </Card>
  );
}
