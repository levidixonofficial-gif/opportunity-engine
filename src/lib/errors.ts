/**
 * Error taxonomy for server actions / services.
 *
 *  - `AppError`  — a deliberate, user-safe message that may be shown verbatim
 *                 (e.g. "That invoice number is already used").
 *  - anything else — treated as internal; the raw message is NEVER shown to the
 *                 user (it could contain DB/stack/secret detail). It is logged
 *                 server-side via captureException.
 */
export class AppError extends Error {
  constructor(
    message: string,
    /** Optional stable code for the client to branch on. */
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Not found / not owned by the caller — collapses IDOR probes to one message. */
export class NotFoundError extends AppError {
  constructor(what = "That item") {
    super(`${what} was not found.`, "not_found");
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "You're going a bit fast — wait a minute and try again.") {
    super(message, "rate_limited");
    this.name = "RateLimitError";
  }
}

export class LimitReachedError extends AppError {
  constructor(message: string) {
    super(message, "limit_reached");
    this.name = "LimitReachedError";
  }
}

/**
 * Resolve an unknown thrown value to a message safe to send to the browser.
 * Only `AppError` instances surface their real message; everything else returns
 * `fallback`.
 */
export function toUserMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  return err instanceof AppError ? err.message : fallback;
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
