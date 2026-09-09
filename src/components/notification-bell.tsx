"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { fetchNotifications, markAllNotificationsRead } from "@/app/actions/notifications";
import { cn } from "@/lib/utils";

interface N {
  id: string;
  type: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  readAt: Date | string | null;
  createdAt: Date | string;
}

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<N[]>([]);
  const [unread, setUnread] = useState(initialUnread);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetchNotifications().then((rows) => setItems(rows as unknown as N[]));
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function clearAll() {
    await markAllNotificationsRead();
    setUnread(0);
    setItems((cur) => cur.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-fg">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.13 }}
            className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-lg border bg-surface shadow-[var(--shadow-lg)]"
          >
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="text-sm font-medium">Notifications</p>
              {unread > 0 && (
                <button onClick={clearAll} className="text-xs text-accent hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted">You&apos;re all caught up.</p>
              ) : (
                items.map((n) => {
                  const inner = (
                    <div
                      className={cn(
                        "border-b px-3 py-2.5 last:border-0",
                        !n.readAt && "bg-accent-subtle/40",
                      )}
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-muted">{n.body}</p>}
                      <p className="mt-0.5 text-[11px] text-muted-2">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  );
                  return n.actionUrl ? (
                    <Link key={n.id} href={n.actionUrl} onClick={() => setOpen(false)} className="block hover:bg-surface-2">
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id}>{inner}</div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
