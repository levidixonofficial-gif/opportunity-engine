"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { GeneratorResult } from "./GeneratorResult";
import { sendMessageAction, runGeneratorAction } from "./actions";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function Assistant({
  initialConversationId,
  initialMessages,
  mode,
  remaining,
}: {
  initialConversationId?: string;
  initialMessages: Msg[];
  mode: "anthropic" | "rule-based";
  remaining: number | null;
}) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function send() {
    const text = input.trim();
    if (!text || pending) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setError(null);
    start(async () => {
      const res = await sendMessageAction(conversationId, text);
      if (res.error) {
        setError(res.error);
        setMessages((m) => m.slice(0, -1).concat({ role: "user", content: text }));
        return;
      }
      if (res.conversationId) setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply ?? "" }]);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    });
  }

  return (
    <div className="flex h-[calc(100dvh-16rem)] min-h-96 flex-col rounded-lg border bg-surface">
      <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted">
        <span>
          {mode === "anthropic" ? "Claude" : "Local mode — no AI key configured"}
        </span>
        {remaining !== null && <span>{remaining} messages left this month</span>}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Ask about an opportunity, your plan, or what to do next. The assistant sees your profile,
            goals, tasks, and progress.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-accent text-accent-fg" : "bg-surface-2"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" /> Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="border-t px-4 py-2 text-xs text-danger">{error}</p>}

      <div className="flex gap-2 border-t p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Message your coach…"
          className="max-h-32 flex-1 resize-none rounded-md border bg-surface px-3 py-2 text-sm"
        />
        <Button onClick={send} disabled={pending || !input.trim()} size="icon" aria-label="Send">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}

const GENERATORS = [
  { kind: "offer", label: "Offer", hint: "Turn an opportunity into a concrete service/product offer" },
  { kind: "outreach", label: "Outreach", hint: "A cold sequence with subject lines + follow-ups" },
  { kind: "content_plan", label: "Content plan", hint: "Pillars, hooks, and a week of ideas" },
  { kind: "business_idea", label: "Business ideas", hint: "2–4 ideas that fit your constraints" },
  { kind: "digital_product", label: "Digital product", hint: "Product concepts with outlines" },
  { kind: "action_plan", label: "Action plan", hint: "A 4-week plan broken into tasks" },
  { kind: "analysis", label: "Idea analysis", hint: "Candid strengths / weaknesses / next steps" },
] as const;

export function Generators({ remaining }: { remaining: number | null }) {
  const [active, setActive] = useState<(typeof GENERATORS)[number]["kind"] | null>(null);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ kind: string; data: unknown; provider: string; disclaimer: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    if (!active || !input.trim()) return;
    setError(null);
    start(async () => {
      const res = await runGeneratorAction(active, input);
      if (res.error) {
        setError(res.error);
        return;
      }
      setResult({
        kind: res.kind ?? active,
        data: res.data,
        provider: res.provider ?? "rule-based",
        disclaimer: res.disclaimer ?? "",
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {GENERATORS.map((g) => (
          <button
            key={g.kind}
            onClick={() => {
              setActive(g.kind);
              setResult(null);
              setError(null);
            }}
            className={`rounded-lg border p-3 text-left transition-colors ${
              active === g.kind ? "border-accent bg-accent-subtle/40" : "hover:bg-surface-2"
            }`}
          >
            <p className="text-sm font-medium">{g.label}</p>
            <p className="text-xs text-muted">{g.hint}</p>
          </button>
        ))}
      </div>

      {active && (
        <div className="rounded-lg border bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium capitalize">{active.replace("_", " ")}</p>
            {remaining !== null && <span className="text-xs text-muted">{remaining} runs left</span>}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder="Add a short brief — niche, audience, constraints…"
            className="w-full rounded-md border bg-surface p-3 text-sm"
          />
          <div className="mt-2 flex justify-end">
            <Button onClick={run} disabled={pending || !input.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {pending ? "Generating…" : "Generate"}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      )}

      {result && (
        <div className="rounded-lg border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Badge tone={result.provider === "anthropic" ? "accent" : "neutral"}>
              {result.provider === "anthropic" ? "AI-generated" : "Template"}
            </Badge>
            <span className="text-xs text-muted">{result.disclaimer}</span>
          </div>
          <GeneratorResult kind={result.kind} data={result.data} />
        </div>
      )}
    </div>
  );
}
