import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { aiMode } from "@/lib/ai";
import { getUserPlan } from "@/server/services/billing";
import { entitlementsFor } from "@/lib/entitlements";
import { assertWithinLimit } from "@/lib/usage";
import { getLatestConversation } from "@/server/services/ai";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { Assistant, Generators } from "./AiClient";

export const metadata = { title: "AI Tools" };

export default async function AiPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const tab = (await searchParams).tab === "generators" ? "generators" : "assistant";

  const [plan, latest, msgLimit, genLimit] = await Promise.all([
    getUserPlan(user.id),
    getLatestConversation(user.id, "assistant"),
    assertWithinLimit(user.id, "ai_message"),
    assertWithinLimit(user.id, "generator_run"),
  ]);
  const ent = entitlementsFor(plan);
  const mode = aiMode();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="AI Tools" description="A coach that knows your data, plus focused generators.">
        <Badge tone={mode === "anthropic" ? "accent" : "warning"}>
          {mode === "anthropic" ? "AI connected" : "Local mode"}
        </Badge>
      </PageHeader>

      {mode === "rule-based" && (
        <Card className="mb-4 border-warning/40">
          <CardContent className="pt-4 text-sm text-muted">
            No <code>ANTHROPIC_API_KEY</code> is set, so the chat returns a summary of your real data
            and the generators use built-in templates (clearly labelled). Add a key to enable
            conversational coaching and AI-written drafts. See <code>docs/ai.md</code>.
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex gap-1 rounded-md border bg-surface p-0.5 text-sm">
        <Link
          href="/ai"
          className={`flex-1 rounded px-3 py-1.5 text-center ${tab === "assistant" ? "bg-surface-3 font-medium" : "text-muted"}`}
        >
          Assistant
        </Link>
        <Link
          href="/ai?tab=generators"
          className={`flex-1 rounded px-3 py-1.5 text-center ${tab === "generators" ? "bg-surface-3 font-medium" : "text-muted"}`}
        >
          Generators
        </Link>
      </div>

      {tab === "assistant" ? (
        <Assistant
          initialConversationId={latest?.id}
          initialMessages={(latest?.messages ?? [])
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))}
          mode={mode}
          remaining={msgLimit.remaining}
        />
      ) : (
        <Generators remaining={genLimit.remaining} />
      )}

      <p className="mt-4 text-xs text-muted">
        This plan ({plan}) includes {ent.limits.aiMessagesPerMonth ?? "unlimited"} AI messages and{" "}
        {ent.limits.generatorRunsPerMonth ?? "unlimited"} generator runs per month. AI output is a
        suggestion, never verified fact, and never a guarantee of income.
      </p>
    </div>
  );
}
