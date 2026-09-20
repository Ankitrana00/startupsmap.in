"use client";

import { useAsyncSubmit } from "./useAsyncSubmit";
import { promoteSchema } from "@/app/api/promote/validate";
import type { PromoteData } from "@/app/api/promote/validate";

export interface UsePromoteSubmitReturn {
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
  const { isSubmitting, isSubmitted, error, submit, reset } = useAsyncSubmit<PromoteData>({
    endpoint: "/api/promote",
    validatePayload: (data) => {
      const parsed = promoteSchema.safeParse(data);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return { success: false, error: firstError?.message ?? "Validation failed" };
      }
      return { success: true, data: parsed.data };
    },
    onSuccess: () => {},
  });

  // usePromoteSubmit uniquely exposes isSubmitted so callers can render a
  // success state without navigating away (the promote form does not redirect).
  return { isSubmitting, isSubmitted, error, submit, reset };
}

