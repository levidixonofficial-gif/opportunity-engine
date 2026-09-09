export function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="prose mt-6 space-y-4 text-sm text-muted">{children}</div>
    </div>
  );
}
