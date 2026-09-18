"use client";

import { useRef, useState } from "react";
import { usePromoteSubmit } from "@/lib/hooks/usePromoteSubmit";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { promoteSchema } from "@/app/api/promote/validate";
import type { ZodError } from "zod";

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

/** Map a ZodError to { fieldName: firstMessage } for per-field display. */
function getFieldErrors(error: ZodError): Partial<Record<FieldName, string>> {
  const fieldErrors: Partial<Record<FieldName, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as FieldName | undefined;
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

/** M3: stable DOM id so inputs can reference their error via aria-describedby. */
function errorId(field: FieldName): string {
  return `promote-error-${field}`;
}

function FieldError({ field, message }: { field: FieldName; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={errorId(field)}
      role="alert"
      data-error={field}
      className="mt-1 text-xs text-destructive"
    >
      {message}
    </p>
  );
}

const emptyFormData = {
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const formRef = useRef<HTMLFormElement | null>(null);
  const { draft, setDraft, clearDraft } = useFormDraft("promote-form:v1", emptyFormData);
  const [formData, setFormData] = useState(() => ({ ...emptyFormData, ...draft }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const field = e.target.name as FieldName;
    const value = e.target.value;
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      setDraft(next);
      return next;
    });
    // Clear the field's error as soon as the user edits it.
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  /** Move focus to the first field flagged invalid. */
  const focusFirstError = (errors: Partial<Record<FieldName, string>>) => {
    const first = FIELD_ORDER.find((field) => errors[field]);
    if (!first) return;
    formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Per-field validation so ALL problems show at once (the hook's own
    // safeParse stays as a safety net for server-side rejections).
    const result = promoteSchema.safeParse(formData);
    if (!result.success) {
      const errors = getFieldErrors(result.error);
      setFieldErrors(errors);
      // M3: don't make the user hunt for the problem.
      focusFirstError(errors);
      return;
    }
    setFieldErrors({});
    const ok = await submit(result.data, formData.honeypot_website);
    // M2: only discard the draft once the request actually succeeded.
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
        <div role="alert" className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <div>
        <label htmlFor="companyName" className="block text-sm font-medium mb-1">
          Company Name <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          id="companyName"
          name="companyName"
          value={formData.companyName}
          onChange={handleChange}
          className={fieldErrors.companyName ? inputErrorClassName : inputClassName}
          aria-invalid={!!fieldErrors.companyName}
          aria-describedby={fieldErrors.companyName ? errorId("companyName") : undefined}
          required
          placeholder="Acme Startup"
        />
        <FieldError field="companyName" message={fieldErrors.companyName} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pocName" className="block text-sm font-medium mb-1">
            POC Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="pocName"
            name="pocName"
            value={formData.pocName}
            onChange={handleChange}
            className={fieldErrors.pocName ? inputErrorClassName : inputClassName}
            aria-invalid={!!fieldErrors.pocName}
            aria-describedby={fieldErrors.pocName ? errorId("pocName") : undefined}
            required
            placeholder="John Doe"
          />
          <FieldError field="pocName" message={fieldErrors.pocName} />
        </div>

        <div>
          <label htmlFor="pocEmail" className="block text-sm font-medium mb-1">
            POC Email <span className="text-destructive">*</span>
          </label>
          <input
            type="email"
            id="pocEmail"
            name="pocEmail"
            value={formData.pocEmail}
            onChange={handleChange}
            className={fieldErrors.pocEmail ? inputErrorClassName : inputClassName}
            aria-invalid={!!fieldErrors.pocEmail}
            aria-describedby={fieldErrors.pocEmail ? errorId("pocEmail") : undefined}
            required
            placeholder="john@example.com"
          />
          <FieldError field="pocEmail" message={fieldErrors.pocEmail} />
        </div>
      </div>

      <div>
        <label htmlFor="contactNumber" className="block text-sm font-medium mb-1">
          Contact Number <span className="text-destructive">*</span>
        </label>
        <input
          type="tel"
          id="contactNumber"
          name="contactNumber"
          value={formData.contactNumber}
          onChange={handleChange}
          className={fieldErrors.contactNumber ? inputErrorClassName : inputClassName}
          required
          placeholder="+91 98765 43210"
        />
        <FieldError field="contactNumber" message={fieldErrors.contactNumber} />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1">
          Message <span className="text-destructive">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={4}
          className={fieldErrors.message ? inputErrorClassName : inputClassName}
          required
          placeholder="Tell us about your promotion needs..."
        />
        <FieldError field="message" message={fieldErrors.message} />
      </div>

      {/* Honeypot: invisible to humans, bots fill it and are silently discarded. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <label htmlFor="honeypot_website">Company website (leave blank)</label>
        <input
          type="text"
          id="honeypot_website"
          name="honeypot_website"
          tabIndex={-1}
          autoComplete="off"
          value={formData.honeypot_website}
          onChange={handleChange}
        />
      </div>

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
