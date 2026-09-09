import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listOutreach } from "@/server/services/outreach";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/misc";
import { Composer, MessageCard } from "./OutreachWorkspace";

export const metadata = { title: "Outreach" };

export default async function OutreachPage() {
  const user = await requireUser();
  const [messages, contacts] = await Promise.all([
    listOutreach(user.id),
    db.contact.findMany({ where: { userId: user.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Outreach"
        description="Draft cold intros, follow-ups, and scripts. Send them yourself, then track what happens."
      />

      <Composer contacts={contacts} />

      <div className="mt-6 space-y-3">
        {messages.length === 0 ? (
          <EmptyState
            title="No drafts yet"
            description="Write one above, or hit Draft to generate a starting point from a short brief."
          />
        ) : (
          messages.map((m) => (
            <MessageCard
              key={m.id}
              message={{ ...m, createdAt: m.createdAt.toISOString() }}
            />
          ))
        )}
      </div>
    </div>
  );
}
