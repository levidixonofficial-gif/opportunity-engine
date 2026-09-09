import { formatCurrency } from "@/lib/utils";

/** Small dependency-free grouped bar chart for monthly revenue vs. expense. */
export function MonthlyBars({
  data,
}: {
  data: { month: string; revenue: number; expense: number; profit: number }[];
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">No transactions yet.</p>;
  }
  const max = Math.max(1, ...data.map((d) => Math.max(d.revenue, d.expense)));
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-full items-end gap-4" style={{ height: 160 }}>
        {data.map((d) => (
          <div key={d.month} className="flex min-w-14 flex-1 flex-col items-center gap-1">
            <div className="flex h-32 w-full items-end justify-center gap-1">
              <div
                className="w-3 rounded-t bg-accent"
                style={{ height: `${(d.revenue / max) * 100}%` }}
                title={`Revenue ${formatCurrency(d.revenue)}`}
              />
              <div
                className="w-3 rounded-t bg-danger/70"
                style={{ height: `${(d.expense / max) * 100}%` }}
                title={`Expense ${formatCurrency(d.expense)}`}
              />
            </div>
            <span className="text-[10px] text-muted">{d.month.slice(2)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm bg-accent" /> Revenue
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm bg-danger/70" /> Expense
        </span>
      </div>
    </div>
  );
}

export function Sparkline({ points, className }: { points: number[]; className?: string }) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const d = points
    .map((p, i) => `${(i / (points.length - 1)) * 100},${100 - ((p - min) / range) * 100}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} aria-hidden>
      <polyline points={d} fill="none" stroke="var(--color-accent)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
