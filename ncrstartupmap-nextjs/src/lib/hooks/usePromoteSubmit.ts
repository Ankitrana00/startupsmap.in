"use client";

import { useState, useCallback } from "react";
import { promoteSchema } from "@/app/api/promote/validate";
import type { PromoteData } from "@/app/api/promote/validate";

interface UsePromoteSubmitReturn {
  isSubmitting: boolean;
  isSubmitted: boolean;
  error: string | null;
  /**
   * Resolves `true` only when the request succeeded. Callers use this to clear
   * a saved form draft — a failed submit must never discard the user's input.
   */
  submit: (data: PromoteData, honeypotWebsite?: string) => Promise<boolean>;
  reset: () => void;
}

export function usePromoteSubmit(): UsePromoteSubmitReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (data: PromoteData, honeypotWebsite?: string): Promise<boolean> => {
    const parsed = promoteSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      setError(firstError?.message ?? "Validation failed");
      return false;
    }

    setIsSubmitting(true);
    setError(null);
    try {
            const res = await fetch("/api/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15_000),
        // Honeypot travels around the schema (zod strips unknown keys) so the
        // server can silently discard bot submissions.
        body: JSON.stringify({ ...parsed.data, honeypot_website: honeypotWebsite ?? "" }),
      });
            if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        // H3: read Retry-After (seconds) so the user sees a cooldown window
        // instead of a flat "too many requests".
        const retryAfter = res.headers.get("Retry-After");
        if (res.status === 429 && retryAfter) {
          const secs = Number(retryAfter);
          const label =
            Number.isFinite(secs) && secs > 0
              ? ` Please try again in ${Math.ceil(secs)} second${secs === 1 ? "" : "s"}.`
              : " Please try again later.";
          throw new Error((err.error ?? "Too many requests") + label);
        }
        throw new Error(err.error ?? "Submission failed");
      }
      setIsSubmitted(true);
      return true;
            } catch (err) {
      // H1: AbortSignal.timeout fires an AbortError after 15s. Surface a
      // readable message instead of a raw "The signal has aborted" or a
      // hang on the submitting button. Check by name because DOMException's
      // prototype chain is non-standard in some test environments.
      const errName = (err as Error | undefined)?.name;
      if (errName === "AbortError" || errName === "TimeoutError") {
        setError("Request timed out — check your connection");
      } else {
        setError(err instanceof Error ? err.message : "Submission failed");
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsSubmitted(false);
    setError(null);
  }, []);

  return { isSubmitting, isSubmitted, error, submit, reset };
}
