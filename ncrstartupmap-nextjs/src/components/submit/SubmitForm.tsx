"use client";

import { FormEvent } from "react";
import { useSubmit } from "@/lib/hooks/useSubmit";
import { useFormFields, mapZodFieldErrors } from "@/lib/hooks/useFormFields";
import { FormField } from "@/components/FormField";
import { HoneypotField } from "@/components/HoneypotField";
import { submitSchema } from "@/app/api/submit/validate";
import type { Startup } from "@/lib/types/startup";

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

const emptyFormData: Record<FieldName, string | boolean | null> = {
  name: "",
  email: "",
  description: "",
  sector: "",
  stage: "",
  area: "",
  founded: "",
  is_hiring: null,
  website: "",
  linkedin: "",
  address: "",
  lat: "",
  lng: "",
  honeypot_website: "",
};

/** M3: focus order matches visual order. */
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

export function SubmitForm() {
  const { isSubmitting, error, submit } = useSubmit();
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
    storageKey: "submit-form:v1",
    emptyFormData,
    fieldOrder: FIELD_ORDER,
    errorPrefix: "submit",
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsedFounded = parseInt(formData.founded as string, 10);
    const missingLat = (formData.lat as string).trim() === "";
    const missingLng = (formData.lng as string).trim() === "";
    const validData = {
      ...formData,
      founded: parsedFounded,
      stage: formData.stage as "Idea" | "Seed" | "Series A" | "Series B" | "Growth",
    };
    const result = submitSchema.safeParse(validData);
    const errors: Partial<Record<FieldName, string>> = result.success
      ? {}
      : mapZodFieldErrors<FieldName>(result.error);
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
      focusFirstError();
      return;
    }
    setFieldErrors({});
    const ok = await submit(result.data as Partial<Startup>, formData.honeypot_website as string);
    if (ok) clearDraft();
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">{error}</div>
      )}

      <FormField
        name="name"
        label="Startup Name"
        required
        value={formData.name}
        onChange={(v) => updateField("name", v)}
        errorMessage={fieldErrors.name}
        errorId={errorId("name")}
        className={fieldErrors.name ? inputErrorClassName : inputClassName}
        type="text"
        placeholder="Acme Startup"
      />

      <FormField
        name="email"
        label="Contact Email"
        required
        value={formData.email}
        onChange={(v) => updateField("email", v)}
        errorMessage={fieldErrors.email}
        errorId={errorId("email")}
        className={fieldErrors.email ? inputErrorClassName : inputClassName}
        type="email"
        placeholder="you@company.com"
      />

      <FormField
        as="textarea"
        name="description"
        label="Description"
        required
        value={formData.description}
        onChange={(v) => updateField("description", v)}
        errorMessage={fieldErrors.description}
        errorId={errorId("description")}
        className={fieldErrors.description ? inputErrorClassName : inputClassName}
        placeholder="What does your startup do?"
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          as="select"
          name="sector"
          label="Sector *"
          required
          value={formData.sector}
          onChange={(v) => updateField("sector", v)}
          errorMessage={fieldErrors.sector}
          errorId={errorId("sector")}
          className={fieldErrors.sector ? inputErrorClassName : inputClassName}
        >
          <option value="">Select sector</option>
          <option value="Fintech">Fintech</option>
          <option value="Healthtech">Healthtech</option>
          <option value="Edtech">Edtech</option>
          <option value="E-commerce">E-commerce</option>
          <option value="AI">AI</option>
          <option value="SaaS">SaaS</option>
                </FormField>

        <FormField
          as="select"
          name="stage"
          label="Stage *"
          required
          value={formData.stage}
          onChange={(v) => updateField("stage", v)}
          errorMessage={fieldErrors.stage}
          errorId={errorId("stage")}
          className={fieldErrors.stage ? inputErrorClassName : inputClassName}
        >
          <option value="">Select stage</option>
          <option value="Idea">Idea</option>
          <option value="Seed">Seed</option>
          <option value="Series A">Series A</option>
          <option value="Series B">Series B</option>
          <option value="Growth">Growth</option>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          as="select"
          name="area"
          label="Area *"
          required
          value={formData.area}
          onChange={(v) => updateField("area", v)}
          errorMessage={fieldErrors.area}
          errorId={errorId("area")}
          className={fieldErrors.area ? inputErrorClassName : inputClassName}
        >
          <option value="">Select area</option>
          <option value="Delhi">Delhi</option>
          <option value="Gurugram">Gurugram</option>
          <option value="Noida">Noida</option>
          <option value="Faridabad">Faridabad</option>
          <option value="Ghaziabad">Ghaziabad</option>
        </FormField>

        <FormField
          name="founded"
          label="Founded Year"
          required
          value={formData.founded}
          onChange={(v) => updateField("founded", v)}
          errorMessage={fieldErrors.founded}
          errorId={errorId("founded")}
          className={fieldErrors.founded ? inputErrorClassName : inputClassName}
          type="number"
          min={1900}
          max={new Date().getFullYear() + 1}
          placeholder="2024"
        />
      </div>

      <FormField
        as="select"
        name="is_hiring"
        label="Hiring Status"
        value={formData.is_hiring === null ? "" : formData.is_hiring ? "true" : "false"}
        onChange={(val) => updateField("is_hiring", val === "" ? null : val === "true")}
        className={inputClassName}
      >
        <option value="">Not specified</option>
        <option value="true">Hiring</option>
        <option value="false">Not hiring</option>
      </FormField>

      <FormField
        name="website"
        label="Website"
        value={formData.website}
        onChange={(v) => updateField("website", v)}
        errorMessage={fieldErrors.website}
        errorId={errorId("website")}
        className={fieldErrors.website ? inputErrorClassName : inputClassName}
        type="url"
        placeholder="https://example.com"
      />

      <FormField
        name="linkedin"
        label="LinkedIn"
        value={formData.linkedin}
        onChange={(v) => updateField("linkedin", v)}
        errorMessage={fieldErrors.linkedin}
        errorId={errorId("linkedin")}
        className={fieldErrors.linkedin ? inputErrorClassName : inputClassName}
        type="url"
        placeholder="https://linkedin.com/company/..."
      />

      <FormField
        name="address"
        label="Address"
        required
        value={formData.address}
        onChange={(v) => updateField("address", v)}
        errorMessage={fieldErrors.address}
        errorId={errorId("address")}
        className={fieldErrors.address ? inputErrorClassName : inputClassName}
        type="text"
        placeholder="Cyber Hub, DLF Phase 3, Gurugram"
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="lat"
          label="Latitude"
          required
          value={formData.lat}
          onChange={(v) => updateField("lat", v)}
          errorMessage={fieldErrors.lat}
          errorId={errorId("lat")}
          className={fieldErrors.lat ? inputErrorClassName : inputClassName}
          type="number"
          step="any"
          min={-90}
          max={90}
          placeholder="28.4595"
        />
        <FormField
          name="lng"
          label="Longitude"
          required
          value={formData.lng}
          onChange={(v) => updateField("lng", v)}
          errorMessage={fieldErrors.lng}
          errorId={errorId("lng")}
          className={fieldErrors.lng ? inputErrorClassName : inputClassName}
          type="number"
          step="any"
          min={-180}
          max={180}
          placeholder="77.0266"
        />
      </div>

      <HoneypotField
        name="honeypot_website"
        value={formData.honeypot_website as string}
        onChange={(v) => updateField("honeypot_website", v)}
      />

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

