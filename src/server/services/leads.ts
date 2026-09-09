import { db } from "@/lib/db";
import { z } from "zod";

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

  // de-dupe against existing contacts by email (case-insensitive) within this user
  const emails = data.rows.map((r) => r.email?.toLowerCase()).filter(Boolean) as string[];
  const existing = emails.length
    ? await db.contact.findMany({
        where: { userId, email: { in: emails } },
        select: { email: true },
      })
    : [];
  const existingEmails = new Set(existing.map((e) => e.email?.toLowerCase()));

  const batch = await db.leadImportBatch.create({
    data: {
      userId,
      source: data.source,
      sourceUrl: data.sourceUrl,
      note: data.note,
      rowCount: data.rows.length,
    },
  });

  let imported = 0;
  let skipped = 0;
  for (const row of data.rows) {
    if (row.email && existingEmails.has(row.email.toLowerCase())) {
      skipped++;
      continue;
    }
    await db.contact.create({
      data: {
        userId,
        name: row.name,
        email: row.email || null,
        company: row.company,
        phone: row.phone,
        website: row.website,
        title: row.title,
        source: "import",
        sourceDetail: data.sourceUrl ?? data.source,
        verificationStatus: "unverified",
        stage: "lead",
        importBatchId: batch.id,
      },
    });
    imported++;
    if (row.email) existingEmails.add(row.email.toLowerCase());
  }

  return { batchId: batch.id, imported, skipped };
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
