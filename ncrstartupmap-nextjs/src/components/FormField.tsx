"use client";

import type { ReactNode } from "react";

/**
 * Shared form-field component (P1 extraction).
 *
 * Owns the wiring between an input, its per-field error message, and the
 * `aria-describedby` / `aria-invalid` attributes that both `SubmitForm` and
 * `PromoteForm` inline. Supports `input`, `textarea`, and `select` variants;
 * for `select`, pass the `<option>`s as `children`.
 *
 * Usage
 *   <FormField
 *     name="email"
 *     label="Email"
 *     required
 *     value={formData.email}
 *     onChange={(v) => updateField("email", v)}
 *     errorMessage={fieldErrors.email}
 *     errorId={errorId("email")}
 *     className={fieldErrors.email ? inputErrorClassName : inputClassName}
 *   />
 *
 *   <FormField
 *     as="select"
 *     name="sector"
 *     label="Sector"
 *     required
 *     value={formData.sector}
 *     onChange={(v) => updateField("sector", v)}
 *     errorMessage={fieldErrors.sector}
 *     errorId={errorId("sector")}
 *     className={fieldErrors.sector ? inputErrorClassName : inputClassName}
 *   >
 *     <option value="">Select sector</option>
 *     <option value="Fintech">Fintech</option>
 *   </FormField>
 */
export type FormFieldAs = "input" | "textarea" | "select";

export interface FormFieldProps {
  name: string;
  label: string;
  value?: string | number | boolean | null;
  onChange: (value: string) => void;
  errorMessage?: string;
  errorId?: string;
  className?: string;
  id?: string;
  required?: boolean;
    placeholder?: string;
  type?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  "aria-describedby"?: string;
  children?: ReactNode;
  autoComplete?: string;
  as?: FormFieldAs;
}

export function FormField({
  name,
  label,
  value,
  onChange,
  errorMessage,
  errorId,
  className,
  id,
  required,
    placeholder,
  type = "text",
  min,
  max,
  step,
  "aria-describedby": ariaDescribedBy,
  children,
  autoComplete,
  as = "input",
}: FormFieldProps) {
  const inputId = id ?? name;
  const describedBy = errorMessage && errorId ? errorId : ariaDescribedBy;
  const stringValue = value == null ? "" : String(value);

  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {as === "select" ? (
        <select
          id={inputId}
          name={name}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          aria-invalid={!!errorMessage}
          aria-describedby={describedBy}
          required={required}
        >
          {children}
        </select>
      ) : as === "textarea" ? (
        <textarea
          id={inputId}
          name={name}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          rows={4}
          aria-invalid={!!errorMessage}
          aria-describedby={describedBy}
          placeholder={placeholder}
          required={required}
        />
      ) : (
        <input
          type={type}
          id={inputId}
          name={name}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          aria-invalid={!!errorMessage}
          aria-describedby={describedBy}
                    required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          min={min}
          max={max}
          step={step}
        />
      )}
      {errorMessage ? (
        <p
          id={errorId}
          role="alert"
          data-error={name}
          className="mt-1 text-xs text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

