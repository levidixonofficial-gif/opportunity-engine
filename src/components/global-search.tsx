"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Search, CornerDownLeft, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { runGlobalSearch } from "@/app/actions/search";
import type { SearchHit, SearchResults } from "@/server/services/search";
import { cn } from "@/lib/utils";

export function GlobalSearchTrigger({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 rounded-md border bg-surface px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-foreground",
          className,
        )}
        aria-label="Search (Command K)"
      >
        <Search className="size-4" />
        <span className="hidden lg:inline">Search…</span>
        <kbd className="ml-auto hidden rounded border bg-surface-2 px-1 text-[10px] lg:inline">⌘K</kbd>
      </button>
      <SearchDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [pending, start] = useTransition();
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const flatHits: SearchHit[] = results ? results.groups.flatMap((g) => g.hits) : [];

  const search = useCallback((value: string) => {
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    start(async () => {
      const r = await runGlobalSearch(value);
      setResults(r);
      setActiveIndex(0);
    });
  }, []);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear transient search state when the dialog closes
      setQ("");
      setResults(null);
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const id = setTimeout(() => search(q), 180);
    return () => clearTimeout(id);
  }, [q, search]);

  function go(hit: SearchHit) {
    onClose();
    router.push(hit.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatHits.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && flatHits[activeIndex]) {
      e.preventDefault();
      go(flatHits[activeIndex]);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-label="Search"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg border bg-surface shadow-[var(--shadow-lg)]"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-2 border-b px-3">
              {pending ? (
                <Loader2 className="size-4 animate-spin text-muted" />
              ) : (
                <Search className="size-4 text-muted" />
              )}
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search opportunities, projects, tasks, contacts…"
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted"
              />
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {q.trim().length < 2 ? (
                <p className="p-4 text-center text-sm text-muted">Type at least 2 characters.</p>
              ) : !results || results.total === 0 ? (
                <p className="p-4 text-center text-sm text-muted">
                  {pending ? "Searching…" : `No matches for “${q}”.`}
                </p>
              ) : (
                results.groups.map((group) => (
                  <div key={group.label} className="mb-2 last:mb-0">
                    <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                      {group.label}
                    </p>
                    {group.hits.map((hit) => {
                      const idx = flatHits.indexOf(hit);
                      return (
                        <button
                          key={`${hit.type}-${hit.id}`}
                          onClick={() => go(hit)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm",
                            idx === activeIndex ? "bg-surface-2" : "",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{hit.title}</span>
                            {hit.subtitle && (
                              <span className="block truncate text-xs text-muted">{hit.subtitle}</span>
                            )}
                          </span>
                          {idx === activeIndex && <CornerDownLeft className="size-3.5 shrink-0 text-muted" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
