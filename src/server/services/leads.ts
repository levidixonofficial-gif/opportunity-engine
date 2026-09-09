import { db } from "@/lib/db";
import { z } from "zod";
import { sanitizeImportedCell } from "@/lib/db-helpers";
import { recomputeGoalsForMetric } from "@/server/services/goals";

/**
 * Legitimate lead import. Users bring their OWN lists (CSV / pasted rows) or,
 * in future, connect a permitted API. We record the source + a timestamp and
 * mark every row "unverified" until the user (or a verification integration)
 * confirms it. We never fabricate contact details and never scrape.
 */

const rowSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().optional().or(z.literal("")),
  company: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  website: z.string().trim().max(200).optional(),
  title: z.string().trim().max(120).optional(),
});

export const importInputSchema = z.object({
  source: z.enum(["csv", "manual_list", "public_directory"]).default("manual_list"),
  sourceUrl: z.string().trim().max(300).optional(),
  note: z.string().trim().max(500).optional(),
  rows: z.array(rowSchema).min(1).max(500),
});
export type ImportInput = z.infer<typeof importInputSchema>;

export interface ImportResult {
  batchId: string;
  imported: number;
  skipped: number;
}

export async function importLeads(userId: string, input: ImportInput): Promise<ImportResult> {
  const data = importInputSchema.parse(input);

  // Neutralise spreadsheet formula injection on every free-text field.
  const rows = data.rows.map((r) => ({
    name: sanitizeImportedCell(r.name),
    email: r.email ? r.email.toLowerCase() : "",
    company: r.company ? sanitizeImportedCell(r.company) : undefined,
    phone: r.phone ? sanitizeImportedCell(r.phone) : undefined,
    website: r.website ? sanitizeImportedCell(r.website) : undefined,
    title: r.title ? sanitizeImportedCell(r.title) : undefined,
  }));

  // De-dupe against existing contacts by email within this user.
  const emails = rows.map((r) => r.email).filter(Boolean);
  const existing = emails.length
    ? await db.contact.findMany({ where: { userId, email: { in: emails } }, select: { email: true } })
    : [];
  const seen = new Set(existing.map((e) => e.email?.toLowerCase()).filter(Boolean));

  const batch = await db.leadImportBatch.create({
    data: {
      userId,
      source: data.source,
      sourceUrl: data.sourceUrl,
      note: data.note,
      rowCount: rows.length,
    },
  });

  const toCreate: { name: string; email: string | null; company?: string; phone?: string; website?: string; title?: string }[] = [];
  let skipped = 0;
  for (const row of rows) {
    if (row.email && seen.has(row.email)) {
      skipped++;
      continue;
    }
    toCreate.push({ ...row, email: row.email || null });
    if (row.email) seen.add(row.email);
  }

  if (toCreate.length) {
    await db.contact.createMany({
      data: toCreate.map((c) => ({
        userId,
        name: c.name,
        email: c.email,
        company: c.company,
        phone: c.phone,
        website: c.website,
        title: c.title,
        source: "import",
        sourceDetail: data.sourceUrl ?? data.source,
        verificationStatus: "unverified",
        stage: "lead",
        importBatchId: batch.id,
      })),
    });
    await recomputeGoalsForMetric(userId, ["leads"]);
  }

  return { batchId: batch.id, imported: toCreate.length, skipped };
}

/** Very small CSV parser for the import UI (header row required). */
export function parseCsv(text: string): { rows: Record<string, string>[]; error?: string } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { rows: [], error: "Need a header row and at least one data row." };
  const split = (l: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (ch === '"') {
        if (q && l[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = !q;
      } else if (ch === "," && !q) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const header = split(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map((l) => {
    const cells = split(l);
    const rec: Record<string, string> = {};
    header.forEach((h, i) => (rec[h] = cells[i] ?? ""));
    return rec;
  });
  return { rows };
}
