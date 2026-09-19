import * as Sentry from "@sentry/nextjs";
import { validateEnv } from "@/lib/env/validate";

/**
 * P1-7: validate env at server boot. A missing/invalid variable now fails
 * loudly at startup instead of surfacing as opaque 500s per-request.
 * (Dev note: SMTP_* are optional, so a bare dev boot still passes.)
 */
export function register(): void {
  try {
    validateEnv();
  } catch (err) {
     
    console.error("[boot] environment validation failed:", err);
    throw err;
  }
}

export const onRequestError = Sentry.captureRequestError;
