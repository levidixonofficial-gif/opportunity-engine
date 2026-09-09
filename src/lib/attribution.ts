import { z } from "zod";

/**
 * Privacy-conscious UTM / attribution handling.
 *
 * Capture: `captureParams()` runs client-side on landing pages and stores a
 * first-touch snapshot in a short-lived cookie (oe_attr). At signup the server
 * reads + validates it and writes one Attribution row, then the cookie is
 * cleared. Values are strictly validated — arbitrary query params never become
 * trusted data. See docs/analytics.md.
 */

export const ATTR_COOKIE = "oe_attr";

const seg = z
  .string()
  .trim()
  .max(120)
  .regex(/^[\w .:/?&=%+-]*$/, "unexpected characters")
  .optional();

export const attributionSchema = z.object({
  source: seg,
  medium: seg,
  campaign: seg,
  term: seg,
  content: seg,
  referrer: z.string().trim().max(300).optional(),
  landingPath: z.string().trim().max(300).optional(),
});

export type Attribution = z.infer<typeof attributionSchema>;

export function parseAttributionCookie(raw: string | undefined): Attribution | null {
  if (!raw) return null;
  try {
    const parsed = attributionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Build an attribution object from a URLSearchParams + document context. */
export function attributionFromSearch(
  params: URLSearchParams,
  ctx: { referrer?: string; path?: string },
): Attribution {
  const pick = (k: string) => {
    const v = params.get(k) ?? undefined;
    return v ? v.slice(0, 120) : undefined;
  };
  return attributionSchema.parse({
    source: pick("utm_source"),
    medium: pick("utm_medium"),
    campaign: pick("utm_campaign"),
    term: pick("utm_term"),
    content: pick("utm_content"),
    referrer: ctx.referrer?.slice(0, 300),
    landingPath: ctx.path?.slice(0, 300),
  });
}

export function hasAnyAttribution(a: Attribution | null): boolean {
  return !!a && Object.values(a).some(Boolean);
}
