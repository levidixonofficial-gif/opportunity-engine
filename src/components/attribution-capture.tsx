"use client";

import { useEffect } from "react";

/**
 * Client capture of first-touch attribution. Writes a first-party cookie
 * (oe_attr, 30 days, lax) only when it is not already set and there is at least
 * one UTM param or an external referrer. Server reads + validates it at signup.
 */
export function AttributionCapture() {
  useEffect(() => {
    try {
      if (document.cookie.includes("oe_attr=")) return;
      const params = new URLSearchParams(window.location.search);
      const utm = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
      const hasUtm = utm.some((k) => params.get(k));
      const ref = document.referrer && !document.referrer.includes(window.location.host) ? document.referrer : "";
      if (!hasUtm && !ref) return;

      const data = {
        source: params.get("utm_source")?.slice(0, 120) || undefined,
        medium: params.get("utm_medium")?.slice(0, 120) || undefined,
        campaign: params.get("utm_campaign")?.slice(0, 120) || undefined,
        term: params.get("utm_term")?.slice(0, 120) || undefined,
        content: params.get("utm_content")?.slice(0, 120) || undefined,
        referrer: ref.slice(0, 300) || undefined,
        landingPath: window.location.pathname.slice(0, 300),
      };
      document.cookie = `oe_attr=${encodeURIComponent(JSON.stringify(data))}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
