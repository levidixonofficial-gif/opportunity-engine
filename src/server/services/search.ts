import { db } from "@/lib/db";

export interface SearchHit {
  type: "opportunity" | "project" | "task" | "contact" | "deal" | "help";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export interface SearchResults {
  query: string;
  groups: { label: string; hits: SearchHit[] }[];
  total: number;
}

const HELP_DOCS: { title: string; body: string; href: string }[] = [
  { title: "How the fit score works", body: "deterministic scoring skill budget time goal", href: "/how-it-works" },
  { title: "Generating a plan from an opportunity", body: "plan tasks execution 30 day", href: "/plan" },
  { title: "Tracking money", body: "revenue expense profit invoice estimated actual", href: "/money" },
  { title: "Using the CRM", body: "leads contacts deals pipeline follow up outreach", href: "/leads" },
  { title: "Billing & plans", body: "free pro premium stripe entitlements upgrade", href: "/billing" },
];

/**
 * Global search across the user's own data. Every query is scoped by userId.
 * Uses `contains` (portable); on Postgres the service layer can add
 * case-insensitive mode later.
 */
export async function globalSearch(userId: string, rawQuery: string): Promise<SearchResults> {
  const q = rawQuery.trim();
  if (q.length < 2) return { query: q, groups: [], total: 0 };
  const like = { contains: q };

  const [opportunities, projects, tasks, contacts, deals] = await Promise.all([
    db.opportunity.findMany({
      where: { status: "published", OR: [{ name: like }, { summary: like }] },
      select: { id: true, slug: true, name: true, summary: true, category: { select: { label: true } } },
      take: 5,
    }),
    db.project.findMany({
      where: { userId, OR: [{ name: like }, { description: like }] },
      select: { id: true, name: true, status: true },
      take: 5,
    }),
    db.task.findMany({
      where: { userId, OR: [{ title: like }, { detail: like }] },
      select: { id: true, title: true, status: true, projectId: true },
      take: 5,
    }),
    db.contact.findMany({
      where: { userId, OR: [{ name: like }, { company: like }, { email: like }] },
      select: { id: true, name: true, company: true, stage: true },
      take: 5,
    }),
    db.deal.findMany({
      where: { userId, title: like },
      select: { id: true, title: true, stage: true },
      take: 5,
    }),
  ]);

  const groups: SearchResults["groups"] = [];
  const push = (label: string, hits: SearchHit[]) => {
    if (hits.length) groups.push({ label, hits });
  };

  push(
    "Opportunities",
    opportunities.map((o) => ({
      type: "opportunity" as const,
      id: o.id,
      title: o.name,
      subtitle: o.category.label,
      href: `/opportunities/${o.slug}`,
    })),
  );
  push(
    "Projects",
    projects.map((p) => ({
      type: "project" as const,
      id: p.id,
      title: p.name,
      subtitle: p.status,
      href: `/projects/${p.id}`,
    })),
  );
  push(
    "Tasks",
    tasks.map((t) => ({
      type: "task" as const,
      id: t.id,
      title: t.title,
      subtitle: t.status,
      href: t.projectId ? `/projects/${t.projectId}` : "/tasks",
    })),
  );
  push(
    "Contacts",
    contacts.map((c) => ({
      type: "contact" as const,
      id: c.id,
      title: c.name,
      subtitle: c.company ?? c.stage,
      href: `/leads/${c.id}`,
    })),
  );
  push(
    "Deals",
    deals.map((d) => ({
      type: "deal" as const,
      id: d.id,
      title: d.title,
      subtitle: d.stage,
      href: `/leads`,
    })),
  );

  const ql = q.toLowerCase();
  const help = HELP_DOCS.filter(
    (h) => h.title.toLowerCase().includes(ql) || h.body.includes(ql),
  ).map((h) => ({ type: "help" as const, id: h.href, title: h.title, href: h.href }));
  push("Help", help);

  return { query: q, groups, total: groups.reduce((n, g) => n + g.hits.length, 0) };
}
