"use client";

import { CopyButton } from "@/components/ui/copy-button";

/** Renders each generator's structured output. Pure presentational. */
export function GeneratorResult({ kind, data }: { kind: string; data: unknown }) {
  const d = data as Record<string, unknown>;
  const text = plainText(kind, d);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <CopyButton value={text} label="Copy all" />
      </div>
      {kind === "offer" && <Offer d={d} />}
      {kind === "outreach" && <Outreach d={d} />}
      {kind === "content_plan" && <ContentPlan d={d} />}
      {kind === "business_idea" && <BusinessIdeas d={d} />}
      {kind === "digital_product" && <DigitalProducts d={d} />}
      {kind === "action_plan" && <ActionPlan d={d} />}
      {kind === "analysis" && <Analysis d={d} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

const list = (v: unknown) => (Array.isArray(v) ? v : []) as string[];

function Offer({ d }: { d: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <Section title="Offer name">{String(d.name)}</Section>
      <Section title="Target customer">{String(d.targetCustomer)}</Section>
      <Section title="Problem">{String(d.problem)}</Section>
      <Section title="Solution">{String(d.solution)}</Section>
      <Section title="Deliverables">
        <ul className="list-disc space-y-0.5 pl-4">
          {list(d.deliverables).map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </Section>
      <Section title="Pricing">{String(d.pricingStructure)}</Section>
      <Section title="Positioning">{String(d.positioning)}</Section>
      <Section title="Risk reversal">{String(d.guaranteeOrRiskReversal)}</Section>
    </div>
  );
}

function Outreach({ d }: { d: Record<string, unknown> }) {
  const followUps = (d.followUps as { afterDays: number; message: string }[]) ?? [];
  return (
    <div className="space-y-3">
      <Section title="Subject lines">
        <ul className="list-disc space-y-0.5 pl-4">
          {list(d.subjectLines).map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </Section>
      <Section title="Message">
        <pre className="whitespace-pre-wrap rounded-md bg-surface-2 p-3 font-sans">{String(d.message)}</pre>
      </Section>
      <Section title="Follow-ups">
        <ul className="space-y-1.5">
          {followUps.map((f, i) => (
            <li key={i} className="rounded-md border p-2">
              <span className="text-xs text-muted">after {f.afterDays} days</span>
              <p>{f.message}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Personalization tips">
        <ul className="list-disc space-y-0.5 pl-4">
          {list(d.personalizationTips).map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function ContentPlan({ d }: { d: Record<string, unknown> }) {
  const ideas = (d.ideas as { title: string; format: string; angle: string }[]) ?? [];
  return (
    <div className="space-y-3">
      <Section title="Audience">{String(d.audience)}</Section>
      <Section title="Pillars">
        <div className="flex flex-wrap gap-1.5">
          {list(d.pillars).map((p, i) => (
            <span key={i} className="rounded-full border px-2 py-0.5 text-xs">
              {p}
            </span>
          ))}
        </div>
      </Section>
      <Section title="Hooks">
        <ul className="list-disc space-y-0.5 pl-4">
          {list(d.hooks).map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </Section>
      <Section title="Cadence">{String(d.weeklyCadence)}</Section>
      <Section title="Ideas">
        <ul className="space-y-1">
          {ideas.map((idea, i) => (
            <li key={i} className="rounded-md border p-2">
              <span className="font-medium">{idea.title}</span>
              <span className="text-xs text-muted"> · {idea.format} · {idea.angle}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function BusinessIdeas({ d }: { d: Record<string, unknown> }) {
  const ideas = (d.ideas as Record<string, string>[]) ?? [];
  return (
    <div className="space-y-3">
      {ideas.map((idea, i) => (
        <div key={i} className="rounded-md border p-3">
          <p className="font-medium">{idea.name}</p>
          <p className="text-xs text-muted">For: {idea.who}</p>
          <p className="mt-1 text-sm">{idea.offer}</p>
          <p className="mt-1 text-xs">
            <span className="text-muted">First customer:</span> {idea.firstCustomerPath}
          </p>
          <p className="text-xs">
            <span className="text-muted">Why it fits:</span> {idea.whyItFits}
          </p>
          <p className="text-xs text-warning">Main risk: {idea.mainRisk}</p>
        </div>
      ))}
    </div>
  );
}

function DigitalProducts({ d }: { d: Record<string, unknown> }) {
  const concepts = (d.concepts as Record<string, unknown>[]) ?? [];
  return (
    <div className="space-y-3">
      {concepts.map((c, i) => (
        <div key={i} className="rounded-md border p-3">
          <p className="font-medium">{String(c.title)}</p>
          <p className="text-xs text-muted">{String(c.format)}</p>
          <p className="mt-1 text-sm">{String(c.problemSolved)}</p>
          <ul className="mt-1 list-disc pl-4 text-xs">
            {list(c.outline).map((x, j) => (
              <li key={j}>{x}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted">Pricing idea: {String(c.pricingIdea)}</p>
        </div>
      ))}
    </div>
  );
}

function ActionPlan({ d }: { d: Record<string, unknown> }) {
  const weeks = (d.weeks as { label: string; focus: string; tasks: string[] }[]) ?? [];
  return (
    <div className="space-y-3">
      <p className="font-medium">{String(d.title)}</p>
      {weeks.map((w, i) => (
        <div key={i} className="rounded-md border p-3">
          <p className="text-sm font-medium">
            {w.label} — <span className="font-normal text-muted">{w.focus}</span>
          </p>
          <ul className="mt-1 list-disc pl-4 text-sm">
            {w.tasks.map((t, j) => (
              <li key={j}>{t}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Analysis({ d }: { d: Record<string, unknown> }) {
  const blocks: [string, string][] = [
    ["Strengths", "strengths"],
    ["Weaknesses", "weaknesses"],
    ["Risks", "risks"],
    ["Open questions", "openQuestions"],
    ["Recommended next steps", "recommendedNextSteps"],
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm">{String(d.summary)}</p>
      {blocks.map(([label, key]) => (
        <Section key={key} title={label}>
          <ul className="list-disc space-y-0.5 pl-4">
            {list(d[key]).map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Section>
      ))}
    </div>
  );
}

function plainText(kind: string, d: Record<string, unknown>): string {
  return `${kind.toUpperCase()}\n\n${JSON.stringify(d, null, 2)}`;
}
