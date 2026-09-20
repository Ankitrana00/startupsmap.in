"use client";

import { useCallback, useRef, useState } from "react";
import type { ZodError } from "zod";
import { useFormDraft } from "./useFormDraft";

/**
 * Shared form state hook (P1 extraction).
 *
 * Consolidates draft sync, per-field error management, error-id generation,
 * first-error focus, and form-reset behavior that both `SubmitForm` and
 * `PromoteForm` previously implemented inline. Each form keeps its own
 * `FieldName` union, `emptyFormData`, `fieldOrder`, schema, layout, and submit hook.
 *
 * Usage
 *   const { formData, fieldErrors, updateField, focusFirstError, errorId,
 *          formRef, clearDraft, resetForm, setFieldErrors, clearFieldErrors } =
 *     useFormFields<FieldName>({
 *       storageKey: "submit-form:v1",
 *       emptyFormData,
 *       fieldOrder: FIELD_ORDER,
 *       errorPrefix: "submit",
 *     });
 */
export interface UseFormFieldsOptions<TFieldName extends string> {
  /** localStorage key for draft persistence (passed to useFormDraft). */
  storageKey: string;
  /** Initial/empty values for every field — also the reset target. */
  emptyFormData: Record<TFieldName, string | boolean | null>;
  /** Field order used by `focusFirstError` to pick the first invalid field. */
  fieldOrder: TFieldName[];
  /** Prefix for generated error ids (default `"form"` → `"form-error-<field>"`). */
  errorPrefix?: string;
}

export interface UseFormFieldsReturn<TFieldName extends string> {
  /** Form values merged from defaults + restored draft + user edits. */
  formData: Record<TFieldName, string | boolean | null>;
  /** Per-field error messages keyed by field name. */
  fieldErrors: Partial<Record<TFieldName, string>>;
  /** Update a single field: persists draft, updates formData, clears that field's error. */
  updateField: (field: TFieldName, value: string | boolean | null) => void;
    /** Focus the first field in `fieldOrder` that has an error.
   * Pass `errors` to use a fresh error map without waiting for state to settle. */
  focusFirstError: (errors?: Partial<Record<TFieldName, string>>) => void;
  /** Clear every field error without touching form values or the draft. */
  clearFieldErrors: () => void;
  /** Replace the entire error map (for server-side validation errors). */
  setFieldErrors: (errors: Partial<Record<TFieldName, string>>) => void;
  /** Stable DOM id for a field's error message (e.g. `"submit-error-email"`). */
  errorId: (field: TFieldName) => string;
  /** Attach to `<form>` for focus management. */
  formRef: React.RefObject<HTMLFormElement | null>;
  /** Remove the draft from localStorage (call after a successful submit). */
  clearDraft: () => void;
  /** Reset formData to `emptyFormData`, clear errors, and clear the draft. */
  resetForm: () => void;
}

export function useFormFields<TFieldName extends string>(
  opts: UseFormFieldsOptions<TFieldName>,
): UseFormFieldsReturn<TFieldName> {
  const { storageKey, emptyFormData, fieldOrder, errorPrefix = "form" } = opts;

  const formRef = useRef<HTMLFormElement | null>(null);

  const { draft, setDraft, clearDraft } = useFormDraft<Record<TFieldName, string | boolean | null>>(
    storageKey,
    emptyFormData,
  );

  const [formData, setFormData] = useState<Record<TFieldName, string | boolean | null>>(
    () => ({ ...emptyFormData, ...draft }),
  );

  const [fieldErrors, setFieldErrorsState] = useState<Partial<Record<TFieldName, string>>>({});

  const errorId = useCallback(
    (field: TFieldName) => `${errorPrefix}-error-${field}`,
    [errorPrefix],
  );

  const setFieldErrors = useCallback((errors: Partial<Record<TFieldName, string>>) => {
    setFieldErrorsState(errors);
  }, []);

  const clearFieldErrors = useCallback(() => {
    setFieldErrorsState({});
  }, []);

  const updateField = useCallback(
    (field: TFieldName, value: string | boolean | null) => {
      setFormData((prev) => {
        const next = { ...prev, [field]: value };
        setDraft(next);
        // Clear the field's error as soon as the user edits it.
        setFieldErrorsState((prevErrors) => {
          if (!prevErrors[field]) return prevErrors;
          const nextErrors = { ...prevErrors };
          delete nextErrors[field];
          return nextErrors;
        });
        return next;
      });
    },
    [setDraft],
  );

    const focusFirstError = useCallback(
    (errors?: Partial<Record<TFieldName, string>>) => {
      const target = errors ?? fieldErrors;
      const first = fieldOrder.find((field) => target[field]);
      if (!first) return;
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    },
    [fieldOrder, fieldErrors],
  );

  const resetForm = useCallback(() => {
    setFormData(emptyFormData);
    setFieldErrorsState({});
    clearDraft();
  }, [emptyFormData, clearDraft]);

  return {
    formData,
    fieldErrors,
    updateField,
    focusFirstError,
    clearFieldErrors,
    setFieldErrors,
    errorId,
    formRef,
    clearDraft,
    resetForm,
  };
}

/**
 * Map a ZodError to `{ fieldName: firstMessage }` for per-field display.
 * Shared by both forms (was duplicated as `getFieldErrors` in each).
 */
export function mapZodFieldErrors<TFieldName extends string>(
  error: ZodError,
): Partial<Record<TFieldName, string>> {
  const fieldErrors: Partial<Record<TFieldName, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as TFieldName | undefined;
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}
