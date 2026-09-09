"use client";

import { useState } from "react";
import { LifeBuoy, MessageSquare, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { submitFeedback } from "@/app/actions/feedback";

/**
 * Floating help/feedback button. Feedback is stored in the DB (Feedback model)
 * and, when Resend is configured (Phase 7), also emailed to support. With no
 * email integration it still records the message honestly rather than
 * pretending a ticket was opened.
 */
export function ContactButton() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  async function onSubmit(formData: FormData) {
    setPending(true);
    const res = await submitFeedback(formData);
    setPending(false);
    if (res.ok) {
      toast({ tone: "success", title: "Thanks — we got your message." });
      setDialogOpen(false);
    } else {
      toast({ tone: "error", title: "Could not send", description: res.error });
    }
  }

  return (
    <>
      <div className="no-print fixed bottom-20 left-4 z-40 md:bottom-6">
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute bottom-12 left-0 w-48 overflow-hidden rounded-md border bg-surface py-1 shadow-[var(--shadow-lg)]"
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setDialogOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-2"
              >
                <MessageSquare className="size-4" /> Send feedback
              </button>
              <Link
                href="/contact"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-2"
              >
                <LifeBuoy className="size-4" /> Contact &amp; help
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close help menu" : "Open help menu"}
          aria-expanded={menuOpen}
          className="grid size-10 place-items-center rounded-full border bg-surface text-muted shadow-[var(--shadow-lg)] hover:text-foreground"
        >
          {menuOpen ? <X className="size-4" /> : <LifeBuoy className="size-4" />}
        </button>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Send feedback"
        description="Bug, idea, or confusion — it all helps."
      >
        <form action={onSubmit} className="space-y-3">
          <Textarea
            name="message"
            required
            minLength={5}
            maxLength={4000}
            placeholder="What's on your mind?"
            data-autofocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
