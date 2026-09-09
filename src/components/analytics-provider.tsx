"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { getConsent } from "@/components/cookie-banner";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let started = false;
function startIfAllowed() {
  if (started || !KEY) return;
  if (getConsent() !== "accepted") return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    autocapture: false,
    persistence: "localStorage",
    respect_dnt: true,
  });
  started = true;
}

/**
 * Client analytics. Only initializes PostHog when a key is set AND the visitor
 * has accepted analytics cookies. Captures navigation only (no autocapture, no
 * form/keystroke capture). Server-side events go through src/lib/analytics.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    startIfAllowed();
    const onConsent = () => startIfAllowed();
    window.addEventListener("oe-consent", onConsent);
    return () => window.removeEventListener("oe-consent", onConsent);
  }, []);

  useEffect(() => {
    if (started) posthog.capture("$pageview", { $current_url: window.location.href });
  }, [pathname]);

  return null;
}
