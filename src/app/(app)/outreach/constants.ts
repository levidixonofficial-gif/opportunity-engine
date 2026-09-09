/**
 * Allowed manual status transitions. "delivered" is intentionally NOT reachable
 * by hand — it requires a real sending integration.
 */
export const OUTREACH_STATUS_FLOW = {
  draft: ["sent"],
  sent: ["replied", "lost"],
  replied: ["interested", "lost"],
  interested: ["booked", "lost"],
  booked: ["won", "lost"],
  won: [],
  lost: [],
} as const;
