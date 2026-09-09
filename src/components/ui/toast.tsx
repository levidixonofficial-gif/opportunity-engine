"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Module-level bridge so non-React code (server-action callbacks in client
// components) can still call toast() via the hook; the provider registers here.
let externalToast: ToastContextValue["toast"] | null = null;

export function toast(t: Omit<Toast, "id">) {
  externalToast?.(t);
}

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const TONES: Record<ToastTone, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-accent",
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((cur) => [...cur, { ...t, id }]);
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 5000);
  }, []);

  useEffect(() => {
    externalToast = push;
    return () => {
      externalToast = null;
    };
  }, [push]);

  return (
    <ToastContext.Provider value={{ toast: push }}>
      <div
        className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.18 }}
                role="status"
                className="pointer-events-auto flex items-start gap-3 rounded-md border bg-surface p-3 shadow-[var(--shadow-lg)]"
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", TONES[t.tone])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t.title}</p>
                  {t.description && <p className="text-xs text-muted">{t.description}</p>}
                </div>
                <button
                  onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}
                  className="rounded p-0.5 text-muted hover:text-foreground"
                  aria-label="Dismiss"
                >
                  <X className="size-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? { toast };
}
