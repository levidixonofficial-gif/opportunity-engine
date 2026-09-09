/**
 * Next.js server instrumentation. Initializes Sentry only when SENTRY_DSN is set.
 * No DSN => no-op (the SDK is never touched).
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend(event) {
      // Scrub PII / financial fields as a safety net.
      const scrub = (obj: Record<string, unknown> | undefined) => {
        if (!obj) return;
        for (const k of Object.keys(obj)) {
          if (/email|name|note|message|body|amount|cents|revenue|phone|token|authorization|cookie/i.test(k)) {
            obj[k] = "[scrubbed]";
          }
        }
      };
      scrub(event.extra);
      scrub(event.request?.headers as Record<string, unknown> | undefined);
      if (event.request) delete event.request.cookies;
      return event;
    },
  });
}

export async function onRequestError(...args: unknown[]) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  // @ts-expect-error - forward whatever Next passes
  Sentry.captureRequestError?.(...args);
}
