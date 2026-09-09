"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";

const KEY = "oe-cookie-consent";

export type ConsentValue = "accepted" | "essential";

export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "essential" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Minimal consent notice. Only essential storage (auth cookie, theme,
 * this choice) runs before a decision. Optional analytics (PostHog, Phase 7)
 * must check getConsent() === "accepted" before initializing.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read persisted consent once on mount
    setVisible(getConsent() === null);
  }, []);

  function choose(v: ConsentValue) {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent("oe-consent", { detail: v }));
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="no-print fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-lg border bg-surface p-4 shadow-[var(--shadow-lg)] md:inset-x-0 md:mx-auto"
          role="dialog"
          aria-label="Cookie notice"
        >
          <p className="text-sm">
            We use essential storage to keep you signed in and remember your theme. With your consent
            we also use privacy-friendly product analytics to improve the app.{" "}
            <Link href="/privacy" className="text-accent underline">
              Privacy
            </Link>
            .
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => choose("accepted")}>
              Accept all
            </Button>
            <Button size="sm" variant="outline" onClick={() => choose("essential")}>
              Essential only
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
