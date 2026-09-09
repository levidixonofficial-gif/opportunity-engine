"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  ListChecks,
  FolderKanban,
  Target,
  CheckSquare,
  Users,
  Wallet,
  Sparkles,
  Bookmark,
  BarChart3,
  Settings,
  CreditCard,
  Send,
  Menu,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/opportunities", label: "Opportunities", icon: Compass },
  { href: "/plan", label: "My Plan", icon: ListChecks },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/outreach", label: "Outreach", icon: Send },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/ai", label: "AI Tools", icon: Sparkles },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
] as const;

const MOBILE_TABS = NAV_ITEMS.filter((i) =>
  ["/dashboard", "/opportunities", "/plan", "/leads", "/money"].includes(i.href),
);

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const isActive = useActive();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            isActive(href)
              ? "bg-surface-2 font-medium text-foreground"
              : "text-muted hover:bg-surface-2 hover:text-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileBottomNav() {
  const isActive = useActive();
  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      {MOBILE_TABS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
            isActive(href) ? "text-accent" : "text-muted",
          )}
        >
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileMenuButton({ children }: { children?: React.ReactNode }) {
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
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-md text-muted hover:bg-surface-2 md:hidden"
      >
        <Menu className="size-5" />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[75] md:hidden">
            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22 }}
              className="absolute inset-y-0 left-0 flex w-[82vw] max-w-xs flex-col bg-surface"
              role="dialog"
              aria-label="Menu"
            >
              <div className="flex h-14 items-center justify-between border-b px-4">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="grid size-6 place-items-center rounded-md bg-accent text-xs text-accent-fg">OE</span>
                  Opportunity Engine
                </span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
              <div className="border-t p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-muted">Theme</span>
                  <ThemeToggle />
                </div>
                {children}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
