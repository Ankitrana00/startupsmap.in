import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Startup } from "@/lib/types/startup";

interface UseSubmitReturn {
  isSubmitting: boolean;
  error: string | null;
  /**
   * Resolves `true` only when the submission succeeded (a redirect is then
   * issued). Callers use this to clear a saved form draft — a failed submit
   * must never discard the user's input.
   */
  submit: (data: Partial<Startup>, honeypotWebsite?: string) => Promise<boolean>;
}

export function useSubmit(): UseSubmitReturn {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

    const submit = useCallback(
    async (data: Partial<Startup>, honeypotWebsite?: string): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(15_000),
          body: JSON.stringify({ ...data, honeypot_website: honeypotWebsite ?? "" }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Server error" }));
          // H3: read Retry-After (seconds) so the user sees a cooldown window
          // instead of a flat "too many submissions".
          const retryAfter = res.headers.get("Retry-After");
          if (res.status === 429 && retryAfter) {
            const secs = Number(retryAfter);
            const label =
              Number.isFinite(secs) && secs > 0
                ? ` Please try again in ${Math.ceil(secs)} second${secs === 1 ? "" : "s"}.`
                : " Please try again later.";
            throw new Error((err.error ?? "Too many submissions") + label);
          }
          throw new Error(err.error ?? "Submission failed");
        }
        // Redirect to confirmation page on success
        router.push("/submit/success");
        return true;
      } catch (err) {
        // H1: AbortSignal.timeout fires an AbortError after 15s. Surface a
        // readable message instead of a raw "The signal has aborted" or a
        // hang on the submitting button. Check by name because
        // DOMException's prototype chain is non-standard in some test envs.
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
    [router],
  );

  return { isSubmitting, error, submit };
}
