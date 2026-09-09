"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function MarketingMobileNav({
  items,
  signedIn,
}: {
  items: { href: string; label: string }[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-md text-muted hover:bg-surface-2"
      >
        <Menu className="size-5" />
      </button>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[75]">
            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="absolute inset-y-0 right-0 flex w-[80vw] max-w-xs flex-col bg-surface"
              role="dialog"
              aria-label="Menu"
            >
              <div className="flex h-16 items-center justify-between border-b px-4">
                <span className="font-semibold">Menu</span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2"
                >
                  <X className="size-4" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 p-3">
                {items.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm hover:bg-surface-2"
                  >
                    {n.label}
                  </Link>
                ))}
                <Link
                  href={signedIn ? "/dashboard" : "/sign-in"}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-accent hover:bg-surface-2"
                >
                  {signedIn ? "Go to dashboard" : "Sign in"}
                </Link>
              </nav>
              <div className="flex items-center justify-between border-t p-4">
                <span className="text-xs text-muted">Theme</span>
                <ThemeToggle />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
