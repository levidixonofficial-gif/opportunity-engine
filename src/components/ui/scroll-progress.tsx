"use client";

import { useEffect, useState } from "react";

/** Thin reading-progress bar for long-form pages. Fixed under any sticky header. */
export function ScrollProgress({ topOffset = 0 }: { topOffset?: number }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className="no-print fixed inset-x-0 z-40 h-0.5 bg-transparent"
      style={{ top: topOffset }}
      aria-hidden
    >
      <div className="h-full bg-accent transition-[width] duration-75" style={{ width: `${pct}%` }} />
    </div>
  );
}
