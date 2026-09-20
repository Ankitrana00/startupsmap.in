"use client";

import { useRouter } from "next/navigation";
import { useAsyncSubmit } from "./useAsyncSubmit";
import type { Startup } from "@/lib/types/startup";

export interface UseSubmitReturn {
  isSubmitting: boolean;
  error: string | null;
  /** Resolves `true` only when the submission succeeded (a redirect is then issued). */
  submit: (data: Partial<Startup>, honeypotWebsite?: string) => Promise<boolean>;
}

export function useSubmit(): UseSubmitReturn {
  const router = useRouter();

  const { isSubmitting, error, submit } = useAsyncSubmit<Partial<Startup>>({
    endpoint: "/api/submit",
    onSuccess: () => router.push("/submit/success"),
  });

  return { isSubmitting, error, submit };
}

