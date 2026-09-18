"use client";

import { useRef, useState } from "react";
import { useSubmit } from "@/lib/hooks/useSubmit";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { submitSchema } from "@/app/api/submit/validate";
import type { Startup } from "@/lib/types/startup";
import type { ZodError } from "zod";

type FieldName =
  | "name"
  | "email"
  | "description"
  | "sector"
  | "stage"
  | "area"
  | "founded"
  | "is_hiring"
  | "website"
  | "linkedin"
  | "address"
  | "lat"
  | "lng"
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

/** M3: stable DOM id for a field's error message so inputs can point at it
 *  with aria-describedby instead of relying on proximity alone. */
function errorId(field: FieldName): string {
  return `submit-error-${field}`;
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
  name: "",
  email: "",
  description: "",
  sector: "",
  stage: "",
  area: "",
  founded: "",
  is_hiring: null as boolean | null,
  website: "",
  linkedin: "",
  address: "",
  lat: "",
  lng: "",
  honeypot_website: "",
};

export function SubmitForm() {
  const { isSubmitting, error, submit } = useSubmit();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const formRef = useRef<HTMLFormElement | null>(null);
  const { draft, setDraft, clearDraft } = useFormDraft("submit-form:v1", emptyFormData);
  // Restore draft values on mount (drafts are saved as formData shape).
  const [formData, setFormData] = useState(() => ({
    ...emptyFormData,
    ...draft,
  }));

  const updateField = (field: FieldName, value: string | boolean | null) => {
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

  /** M3: order fields the way they appear so focus lands on the first problem. */
  const FIELD_ORDER: FieldName[] = [
    "name",
    "email",
    "description",
    "sector",
    "stage",
    "area",
    "founded",
    "website",
    "linkedin",
    "address",
    "lat",
    "lng",
  ];

  /** Move focus (and the viewport) to the first field flagged invalid. */
  const focusFirstError = (errors: Partial<Record<FieldName, string>>) => {
    const first = FIELD_ORDER.find((field) => errors[field]);
    if (!first) return;
    const el = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
    el?.focus();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsedFounded = parseInt(formData.founded, 10);
    const missingLat = formData.lat.trim() === "";
    const missingLng = formData.lng.trim() === "";
    const validData = {
      ...formData,
      founded: parsedFounded,
      stage: formData.stage as "Idea" | "Seed" | "Series A" | "Series B" | "Growth",
    };
    const result = submitSchema.safeParse(validData);
    // Merge schema errors with product requirements (founded validity,
    // lat/lng required — the schema alone allows null coordinates) so ALL
    // problems are shown at once instead of one early return hiding the rest.
    const errors: Partial<Record<FieldName, string>> = result.success
      ? {}
      : getFieldErrors(result.error);
    if (Number.isNaN(parsedFounded)) {
      errors.founded = "Enter a valid founding year";
    }
    if (missingLat) {
      errors.lat = "Latitude is required";
    }
    if (missingLng) {
      errors.lng = "Longitude is required";
    }
    if (!result.success || Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // M3: don't make the user hunt for the problem.
      focusFirstError(errors);
      return;
    }
    setFieldErrors({});
    const ok = await submit(result.data as Partial<Startup>, formData.honeypot_website);
    // M2: only discard the draft once the server actually accepted it —
    // a failed submit must leave the user's input intact.
    if (ok) clearDraft();
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      {error && <div className="p-4 rounded-lg bg-destructive/10 text-destructive">{error}</div>}

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Startup Name <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          className={fieldErrors.name ? inputErrorClassName : inputClassName}
          aria-invalid={!!fieldErrors.name}
          aria-describedby={fieldErrors.name ? errorId("name") : undefined}
          required
          placeholder="Acme Startup"
        />
        <FieldError field="name" message={fieldErrors.name} />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Contact Email <span className="text-destructive">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={(e) => updateField("email", e.target.value)}
          className={fieldErrors.email ? inputErrorClassName : inputClassName}
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? errorId("email") : undefined}
          required
          placeholder="you@company.com"
        />
        <FieldError field="email" message={fieldErrors.email} />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description <span className="text-destructive">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
          className={fieldErrors.description ? inputErrorClassName : inputClassName}
          aria-invalid={!!fieldErrors.description}
          aria-describedby={fieldErrors.description ? errorId("description") : undefined}
          rows={4}
          required
          placeholder="What does your startup do?"
        />
        <FieldError field="description" message={fieldErrors.description} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="sector" className="block text-sm font-medium mb-1">Sector *</label>
          <select
            id="sector"
            name="sector"
            value={formData.sector}
            onChange={(e) => updateField("sector", e.target.value)}
            className={fieldErrors.sector ? inputErrorClassName : inputClassName}
            aria-invalid={!!fieldErrors.sector}
            aria-describedby={fieldErrors.sector ? errorId("sector") : undefined}
            required
          >
            <option value="">Select sector</option>
            <option value="Fintech">Fintech</option>
            <option value="Healthtech">Healthtech</option>
            <option value="Edtech">Edtech</option>
            <option value="E-commerce">E-commerce</option>
            <option value="AI">AI</option>
            <option value="SaaS">SaaS</option>
          </select>
          <FieldError field="sector" message={fieldErrors.sector} />
        </div>

        <div>
          <label htmlFor="stage" className="block text-sm font-medium mb-1">Stage *</label>
          <select
            id="stage"
            name="stage"
            value={formData.stage}
            onChange={(e) => updateField("stage", e.target.value)}
            className={fieldErrors.stage ? inputErrorClassName : inputClassName}
            aria-invalid={!!fieldErrors.stage}
            aria-describedby={fieldErrors.stage ? errorId("stage") : undefined}
            required
          >
            <option value="">Select stage</option>
            <option value="Idea">Idea</option>
            <option value="Seed">Seed</option>
            <option value="Series A">Series A</option>
            <option value="Series B">Series B</option>
            <option value="Growth">Growth</option>
          </select>
          <FieldError field="stage" message={fieldErrors.stage} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="area" className="block text-sm font-medium mb-1">Area *</label>
          <select
            id="area"
            name="area"
            value={formData.area}
            onChange={(e) => updateField("area", e.target.value)}
            className={fieldErrors.area ? inputErrorClassName : inputClassName}
            aria-invalid={!!fieldErrors.area}
            aria-describedby={fieldErrors.area ? errorId("area") : undefined}
            required
          >
            <option value="">Select area</option>
            <option value="Delhi">Delhi</option>
            <option value="Gurugram">Gurugram</option>
            <option value="Noida">Noida</option>
            <option value="Faridabad">Faridabad</option>
            <option value="Ghaziabad">Ghaziabad</option>
          </select>
          <FieldError field="area" message={fieldErrors.area} />
        </div>

        <div>
          <label htmlFor="founded" className="block text-sm font-medium mb-1">
            Founded Year <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            id="founded"
            name="founded"
            value={formData.founded}
            onChange={(e) => updateField("founded", e.target.value)}
            className={fieldErrors.founded ? inputErrorClassName : inputClassName}
            aria-invalid={!!fieldErrors.founded}
            aria-describedby={fieldErrors.founded ? errorId("founded") : undefined}
            min="1900"
            max={new Date().getFullYear() + 1}
            required
            placeholder="2024"
          />
          <FieldError field="founded" message={fieldErrors.founded} />
        </div>
      </div>

      <div>
        <label htmlFor="is_hiring" className="block text-sm font-medium mb-1">Hiring Status</label>
        <select
          id="is_hiring"
          name="is_hiring"
          value={formData.is_hiring === null ? "" : formData.is_hiring ? "true" : "false"}
          onChange={(e) => {
            const val = e.target.value;
            updateField("is_hiring", val === "" ? null : val === "true");
          }}
          className={inputClassName}
        >
          <option value="">Not specified</option>
          <option value="true">Hiring</option>
          <option value="false">Not hiring</option>
        </select>
      </div>

      <div>
        <label htmlFor="website" className="block text-sm font-medium mb-1">Website</label>
        <input
          type="url"
          id="website"
          name="website"
          value={formData.website}
          onChange={(e) => updateField("website", e.target.value)}
          className={fieldErrors.website ? inputErrorClassName : inputClassName}
          aria-invalid={!!fieldErrors.website}
          aria-describedby={fieldErrors.website ? errorId("website") : undefined}
          placeholder="https://example.com"
        />
        <FieldError field="website" message={fieldErrors.website} />
      </div>

      <div>
        <label htmlFor="linkedin" className="block text-sm font-medium mb-1">LinkedIn</label>
        <input
          type="url"
          id="linkedin"
          name="linkedin"
          value={formData.linkedin}
          onChange={(e) => updateField("linkedin", e.target.value)}
          className={fieldErrors.linkedin ? inputErrorClassName : inputClassName}
          aria-invalid={!!fieldErrors.linkedin}
          aria-describedby={fieldErrors.linkedin ? errorId("linkedin") : undefined}
          placeholder="https://linkedin.com/company/..."
        />
        <FieldError field="linkedin" message={fieldErrors.linkedin} />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium mb-1">
          Address <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          id="address"
          name="address"
          value={formData.address}
          onChange={(e) => updateField("address", e.target.value)}
          className={fieldErrors.address ? inputErrorClassName : inputClassName}
          aria-invalid={!!fieldErrors.address}
          aria-describedby={fieldErrors.address ? errorId("address") : undefined}
          required
          placeholder="Cyber Hub, DLF Phase 3, Gurugram"
        />
        <FieldError field="address" message={fieldErrors.address} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="lat" className="block text-sm font-medium mb-1">
            Latitude <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            id="lat"
            name="lat"
            value={formData.lat}
            onChange={(e) => updateField("lat", e.target.value)}
            className={fieldErrors.lat ? inputErrorClassName : inputClassName}
            aria-invalid={!!fieldErrors.lat}
            aria-describedby={fieldErrors.lat ? errorId("lat") : undefined}
            step="any"
            min="-90"
            max="90"
            required
            placeholder="28.4595"
          />
          <FieldError field="lat" message={fieldErrors.lat} />
        </div>

        <div>
          <label htmlFor="lng" className="block text-sm font-medium mb-1">
            Longitude <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            id="lng"
            name="lng"
            value={formData.lng}
            onChange={(e) => updateField("lng", e.target.value)}
            className={fieldErrors.lng ? inputErrorClassName : inputClassName}
            aria-invalid={!!fieldErrors.lng}
            aria-describedby={fieldErrors.lng ? errorId("lng") : undefined}
            step="any"
            min="-180"
            max="180"
            required
            placeholder="77.0266"
          />
          <FieldError field="lng" message={fieldErrors.lng} />
        </div>
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
          onChange={(e) => updateField("honeypot_website", e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit Startup"}
      </button>
    </form>
  );
}
