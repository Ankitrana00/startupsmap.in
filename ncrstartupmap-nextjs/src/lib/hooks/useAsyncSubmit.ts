"use client";

import { useCallback, useState } from "react";

/**
 * Shared async submit hook (P1 extraction).
 *
 * Consolidates the fetch + timeout + Retry-After + error-normalization logic
 * that was duplicated between `useSubmit` and `usePromoteSubmit`. The two hooks
 * become thin wrappers that supply endpoint, validation, and success behavior.
 *
 * Contract:
 *  - Always POSTs JSON to `endpoint`.
 *  - Always cancels after `timeoutMs` via AbortSignal.timeout.
 *  - On 429 with Retry-After, appends a human-readable cooldown to the error.
 *  - On AbortError/TimeoutError, surfaces a stable timeout message.
 *  - On other non-ok responses, throws the server's `error` field when present.
 */
export interface UseAsyncSubmitOptions<TData> {
  /** POST destination. */
  endpoint: string;
  /**
   * Turn the raw data (+ optional honeypot) into the JSON body.
   * Defaults to spreading data and adding `honeypot_website`.
   */
  transformBody?: (data: TData, honeypotWebsite?: string) => Record<string, unknown>;
  /**
   * Optional client-side validation run before the fetch.
   * When present, the hook calls this first and aborts with the returned error
   * when `success` is false (matching the existing `usePromoteSubmit` behavior).
   */
  validatePayload?: (
    data: TData,
  ) => { success: true; data: TData } | { success: false; error: string };
  /** Called on a successful response (2xx). */
  onSuccess?: () => void;
  /** Fetch timeout in ms (default 15_000, matching existing hooks). */
  timeoutMs?: number;
}

export interface UseAsyncSubmitReturn<TData> {
  isSubmitting: boolean;
  isSubmitted: boolean;
  error: string | null;
  /** Resolves `true` only when the request succeeded. */
  submit: (data: TData, honeypotWebsite?: string) => Promise<boolean>;
  /** Clears submitted + error state (exposed when the caller wants it). */
  reset: () => void;
}

export function useAsyncSubmit<TData>(
  opts: UseAsyncSubmitOptions<TData>,
): UseAsyncSubmitReturn<TData> {
  const { endpoint, transformBody, validatePayload, onSuccess, timeoutMs = 15_000 } = opts;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultTransform: UseAsyncSubmitOptions<TData>["transformBody"] = (
    data,
    honeypotWebsite,
  ) => ({
    ...data as Record<string, unknown>,
    honeypot_website: honeypotWebsite ?? "",
  });

  const submit = useCallback(
    async (data: TData, honeypotWebsite?: string): Promise<boolean> => {
      // Optional client-side validation (matches usePromoteSubmit behavior).
      if (validatePayload) {
        const parsed = validatePayload(data);
        if (!parsed.success) {
          setError(parsed.error);
          return false;
        }
        data = parsed.data;
      }

      setIsSubmitting(true);
      setError(null);
      try {
        const body = (transformBody ?? defaultTransform)(data, honeypotWebsite);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Server error" }));
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
        onSuccess?.();
        return true;
      } catch (err) {
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
    },
    [endpoint, transformBody, validatePayload, onSuccess, timeoutMs],
  );

  const reset = useCallback(() => {
    setIsSubmitted(false);
    setError(null);
  }, []);

  return { isSubmitting, isSubmitted, error, submit, reset };
}
