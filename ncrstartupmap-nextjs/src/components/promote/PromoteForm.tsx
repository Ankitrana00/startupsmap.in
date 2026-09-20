"use client";

import { FormEvent } from "react";
import { usePromoteSubmit } from "@/lib/hooks/usePromoteSubmit";
import { useFormFields, mapZodFieldErrors } from "@/lib/hooks/useFormFields";
import { FormField } from "@/components/FormField";
import { HoneypotField } from "@/components/HoneypotField";
import { promoteSchema } from "@/app/api/promote/validate";

type FieldName =
  | "companyName"
  | "pocName"
  | "pocEmail"
  | "contactNumber"
  | "message"
  | "honeypot_website";

const inputClassName =
  "w-full rounded-lg border border-input px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20";

const inputErrorClassName =
  "w-full rounded-lg border border-destructive px-3 py-2 focus:outline-none focus:ring-2 focus:ring-destructive/20";

const emptyFormData: Record<FieldName, string | boolean | null> = {
  companyName: "",
  pocName: "",
  pocEmail: "",
  contactNumber: "",
  message: "",
  honeypot_website: "",
};

/** M3: focus order matches visual order. */
const FIELD_ORDER: FieldName[] = [
  "companyName",
  "pocName",
  "pocEmail",
  "contactNumber",
  "message",
];

export function PromoteForm() {
  const { isSubmitting, isSubmitted, error, submit, reset } = usePromoteSubmit();
  const {
    formData,
    fieldErrors,
    setFieldErrors,
    updateField,
    focusFirstError,
    formRef,
    clearDraft,
    errorId,
  } = useFormFields<FieldName>({
    storageKey: "promote-form:v1",
    emptyFormData,
    fieldOrder: FIELD_ORDER,
    errorPrefix: "promote",
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Per-field validation so ALL problems show at once.
    const result = promoteSchema.safeParse(formData);
    if (!result.success) {
      const errors = mapZodFieldErrors<FieldName>(result.error);
      setFieldErrors(errors);
      focusFirstError(errors);
      return;
    }
    setFieldErrors({});
    const ok = await submit(result.data, formData.honeypot_website as string);
    // M2: only discard the draft once the server actually accepted it.
    if (ok) clearDraft();
  };


  if (isSubmitted) {
    return (
      <div data-success className="text-center py-6">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-action/15 flex items-center justify-center">
          <svg className="w-6 h-6 text-action" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Request Submitted!</h2>
        <p className="text-muted-foreground">Our team will contact you soon.</p>
        <button
          type="button"
          onClick={() => {
            reset();
            setFieldErrors({});
          }}
          className="mt-6 text-sm text-primary hover:underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <div role="alert" className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <FormField
        name="companyName"
        label="Company Name"
        required
        value={formData.companyName}
        onChange={(v) => updateField("companyName", v)}
        errorMessage={fieldErrors.companyName}
        errorId={errorId("companyName")}
        className={fieldErrors.companyName ? inputErrorClassName : inputClassName}
        type="text"
        placeholder="Acme Startup"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          name="pocName"
          label="POC Name"
          required
          value={formData.pocName}
          onChange={(v) => updateField("pocName", v)}
          errorMessage={fieldErrors.pocName}
          errorId={errorId("pocName")}
          className={fieldErrors.pocName ? inputErrorClassName : inputClassName}
          type="text"
          placeholder="John Doe"
        />

        <FormField
          name="pocEmail"
          label="POC Email"
          required
          value={formData.pocEmail}
          onChange={(v) => updateField("pocEmail", v)}
          errorMessage={fieldErrors.pocEmail}
          errorId={errorId("pocEmail")}
          className={fieldErrors.pocEmail ? inputErrorClassName : inputClassName}
          type="email"
          placeholder="john@example.com"
        />
      </div>

      <FormField
        name="contactNumber"
        label="Contact Number"
        required
        value={formData.contactNumber}
        onChange={(v) => updateField("contactNumber", v)}
        errorMessage={fieldErrors.contactNumber}
        errorId={errorId("contactNumber")}
        className={fieldErrors.contactNumber ? inputErrorClassName : inputClassName}
        type="tel"
        placeholder="+91 98765 43210"
      />

      <FormField
        as="textarea"
        name="message"
        label="Message"
        required
        value={formData.message}
        onChange={(v) => updateField("message", v)}
        errorMessage={fieldErrors.message}
        errorId={errorId("message")}
        className={fieldErrors.message ? inputErrorClassName : inputClassName}
        placeholder="Tell us about your promotion needs..."
      />

      <HoneypotField
        name="honeypot_website"
        value={formData.honeypot_website as string}
        onChange={(v) => updateField("honeypot_website", v)}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
      >
        {isSubmitting ? "Submitting..." : "Submit Promotion Request"}
      </button>
    </form>
  );
}