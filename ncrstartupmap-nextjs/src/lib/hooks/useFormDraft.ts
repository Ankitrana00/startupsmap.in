"use client";

/**
 * `useFormDraft` — persists/ restores form field values to localStorage so a
 * page refresh or accidental back navigation does not wipe a half-filled
 * multi-field form (M2 fix). Token-based, versioned, best-effort (localStorage
 * failures are non-fatal, same pattern as `persistence.ts`).
 *
 * Usage
 *   const { draft, setDraft, clearDraft } = useFormDraft("submit-form:v1", emptyFormData);
 *   // seed local state from the restored draft:
 *   useState(() => ({ ...emptyFormData, ...draft }));
 *   // persist on change:
 *   setDraft(next);
 *   // clear when the form has been successfully submitted:
 *   clearDraft();
 */

import { useState } from "react";

/** Field values a draft may hold — mirrors the shapes the forms actually use. */
type DraftValue = string | number | boolean | null | undefined;

interface UseFormDraftReturn<T extends Record<string, DraftValue>> {
  /** The persisted draft shape (falling back to `initialState` per field). */
  draft: T;
  /** Persist/overwrite the draft with new values. */
  setDraft: (next: T) => void;
  /** Remove the draft from storage (call after a successful submit). */
  clearDraft: () => void;
}

export function useFormDraft<T extends Record<string, DraftValue>>(
  storageKey: string,
  initialState: T,
): UseFormDraftReturn<T> {
  // Restore the draft once on mount (SSR-safe: nothing on the server).
  const [draft, setDraft_] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return initialState;
      const parsed = JSON.parse(raw) as Partial<T>;
      // Build a complete T from the parsed partial + fallbacks from initialState.
      const merged: T = {} as T;
      for (const key of Object.keys(initialState) as (keyof T)[]) {
        merged[key] =
          parsed[key] !== undefined && parsed[key] !== null && parsed[key] !== ""
            ? (parsed[key] as T[keyof T])
            : (initialState[key] ?? ("" as T[keyof T]));
      }
      return merged;
    } catch {
      return initialState;
    }
  });

  const setDraft: UseFormDraftReturn<T>["setDraft"] = (next) => {
    setDraft_(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Silently ignore: localStorage may be unavailable / blocked.
    }
  };

  const clearDraft = () => {
    setDraft_(initialState);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Non-fatal.
    }
  };

  return { draft, setDraft, clearDraft };
}
