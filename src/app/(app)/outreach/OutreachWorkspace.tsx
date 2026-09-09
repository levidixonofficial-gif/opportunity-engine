"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { CopyButton } from "@/components/ui/copy-button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { OUTREACH_STATUS_FLOW } from "./constants";
import {
  createOutreachAction,
  setOutreachStatusAction,
  deleteOutreachAction,
  generateOutreachDraftAction,
  type DraftResult,
} from "./actions";

interface Contact {
  id: string;
  name: string;
}
interface Message {
  id: string;
  channel: string;
  kind: string;
  subject: string | null;
  body: string;
  status: string;
  contact: { id: string; name: string } | null;
  createdAt: string | Date;
}

export function Composer({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [genPending, startGen] = useTransition();
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [brief, setBrief] = useState("");

  function generate() {
    startGen(async () => {
      const res = await generateOutreachDraftAction(brief || "cold outreach");
      if (res.error) {
        toast({ tone: "error", title: "Draft failed", description: res.error });
        return;
      }
      setDraft(res);
      setBody(res.message ?? "");
      setSubject(res.subjectLines?.[0] ?? "");
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-surface p-4">
      <div className="flex items-center gap-2">
        <input
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Who are you reaching out to, and why? (used to draft)"
          className="h-9 flex-1 rounded-md border bg-surface px-3 text-sm"
        />
        <Button variant="outline" size="sm" onClick={generate} disabled={genPending}>
          <Sparkles className="size-4" />
          {genPending ? "Drafting…" : "Draft"}
        </Button>
      </div>

      {draft?.disclaimer && <p className="text-xs text-muted">{draft.disclaimer}</p>}
      {draft?.subjectLines && draft.subjectLines.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {draft.subjectLines.map((s) => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className="rounded-full border px-2.5 py-1 text-xs hover:bg-surface-2"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        action={(fd) =>
          start(async () => {
            fd.set("body", body);
            fd.set("subject", subject);
            const res = await createOutreachAction({}, fd);
            if (res.ok) {
              toast({ tone: "success", title: "Draft saved" });
              setBody("");
              setSubject("");
              setDraft(null);
              setBrief("");
              router.refresh();
            } else {
              toast({ tone: "error", title: res.error ?? "Failed" });
            }
          })
        }
        className="space-y-2"
      >
        <div className="grid grid-cols-3 gap-2">
          <select name="channel" defaultValue="email" className="h-9 rounded-md border bg-surface px-2 text-sm">
            {["email", "call", "dm", "linkedin"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select name="kind" defaultValue="cold_intro" className="h-9 rounded-md border bg-surface px-2 text-sm">
            {["cold_intro", "follow_up", "proposal", "appointment", "call_script", "custom"].map((k) => (
              <option key={k} value={k}>
                {k.replace("_", " ")}
              </option>
            ))}
          </select>
          <select name="contactId" defaultValue="" className="h-9 rounded-md border bg-surface px-2 text-sm">
            <option value="">No contact</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (email)"
          className="h-9 w-full rounded-md border bg-surface px-3 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={6}
          placeholder="Write your message…"
          className="w-full rounded-md border bg-surface p-3 text-sm"
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending || !body.trim()}>
            {pending ? "Saving…" : "Save draft"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function MessageCard({ message }: { message: Message }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const next = OUTREACH_STATUS_FLOW[message.status as keyof typeof OUTREACH_STATUS_FLOW] ?? [];

  return (
    <div className="rounded-lg border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{message.subject || message.kind.replace("_", " ")}</p>
          <p className="text-xs text-muted">
            {message.channel} · {message.contact?.name ?? "no contact"} ·{" "}
            {new Date(message.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge
          tone={
            message.status === "won"
              ? "success"
              : message.status === "lost"
                ? "danger"
                : message.status === "draft"
                  ? "neutral"
                  : "accent"
          }
        >
          {message.status}
        </Badge>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{message.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CopyButton value={message.subject ? `${message.subject}\n\n${message.body}` : message.body} />
        {next.map((s) => (
          <button
            key={s}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await setOutreachStatusAction(message.id, s as never);
                if (res.error) toast({ tone: "error", title: res.error });
                else router.refresh();
              })
            }
            className="rounded border px-2 py-1 text-xs hover:bg-surface-2"
          >
            Mark {s}
          </button>
        ))}
        <button
          onClick={() => setConfirm(true)}
          className="ml-auto rounded p-1 text-muted hover:text-danger"
          aria-label="Delete draft"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {message.status === "draft" && (
        <p className="mt-2 text-[11px] text-muted-2">
          Sending isn&apos;t automated in this build. Send from your own email/phone, then mark it
          sent here.
        </p>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() =>
          start(async () => {
            await deleteOutreachAction(message.id);
            router.refresh();
          })
        }
        title="Delete this draft?"
        description="It is removed permanently."
        confirmLabel="Delete"
        destructive
        pending={pending}
      />
    </div>
  );
}
