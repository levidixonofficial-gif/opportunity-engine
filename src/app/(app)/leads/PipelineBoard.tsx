"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DEAL_STAGE_ORDER, DEAL_STAGE_LABELS } from "@/lib/validations/enums";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { setContactStageAction } from "./actions";

interface Contact {
  id: string;
  name: string;
  company: string | null;
  stage: string;
  _count: { deals: number; interactions: number };
}

export function PipelineBoard({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const byStage = new Map(DEAL_STAGE_ORDER.map((s) => [s, [] as Contact[]]));
  for (const c of contacts) byStage.get(c.stage as never)?.push(c);

  function move(id: string, dir: -1 | 1) {
    const cur = contacts.find((c) => c.id === id);
    if (!cur) return;
    const idx = DEAL_STAGE_ORDER.indexOf(cur.stage as never);
    const next = DEAL_STAGE_ORDER[Math.max(0, Math.min(DEAL_STAGE_ORDER.length - 1, idx + dir))];
    if (next === cur.stage) return;
    start(async () => {
      await setContactStageAction(id, next);
      router.refresh();
    });
  }

  return (
    <div className={cn("grid gap-3 overflow-x-auto pb-2 md:grid-cols-3 lg:grid-cols-6", pending && "opacity-70")}>
      {DEAL_STAGE_ORDER.map((stage) => {
        const items = byStage.get(stage) ?? [];
        return (
          <div key={stage} className="min-w-[180px] rounded-lg border bg-surface-2/40">
            <div className="flex items-center justify-between px-3 py-2 text-xs font-medium">
              <span>{DEAL_STAGE_LABELS[stage]}</span>
              <span className="text-muted">{items.length}</span>
            </div>
            <div className="space-y-2 p-2">
              {items.map((c) => (
                <div key={c.id} className="rounded-md border bg-surface p-2.5 text-sm">
                  <Link href={`/leads/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                  {c.company && <p className="text-xs text-muted">{c.company}</p>}
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[11px] text-muted">
                      {c._count.deals} deal{c._count.deals !== 1 ? "s" : ""}
                    </span>
                    <span className="flex gap-1">
                      <button
                        onClick={() => move(c.id, -1)}
                        disabled={pending || stage === DEAL_STAGE_ORDER[0]}
                        className="rounded border px-1 text-xs text-muted disabled:opacity-30 hover:bg-surface-2"
                        aria-label="Move back a stage"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => move(c.id, 1)}
                        disabled={pending || stage === "lost"}
                        className="rounded border px-1 text-xs text-muted disabled:opacity-30 hover:bg-surface-2"
                        aria-label="Move forward a stage"
                      >
                        ›
                      </button>
                    </span>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="px-1 py-2 text-xs text-muted-2">Empty</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PipelineValueBar({
  summary,
}: {
  summary: { stage: string; _count: { _all: number }; _sum: { valueCents: number | null } }[];
}) {
  const total = summary.reduce((s, x) => s + (x._sum.valueCents ?? 0), 0);
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted">
      <span>Open pipeline value: {formatCurrency(total)}</span>
      {summary.map((s) => (
        <span key={s.stage}>
          {DEAL_STAGE_LABELS[s.stage as never] ?? s.stage}: {s._count._all}
        </span>
      ))}
    </div>
  );
}
