"use client";

/**
 * Shared honeypot field component (P1 extraction).
 *
 * Both `SubmitForm` and `PromoteForm` inline the same honeypot markup. This
 * component owns that markup once — the form passes the current value + the
 * field updater, and the component renders the invisible-to-humans input that
 * bots fill.
 *
 * Usage
 *   <HoneypotField
 *     name="honeypot_website"
 *     value={formData.honeypot_website}
 *     onChange={updateField}
 *   />
 */
export interface HoneypotFieldProps {
  name: string;
      value: string;
  onChange: (value: string) => void;
}

export function HoneypotField({ name, value, onChange }: HoneypotFieldProps) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
      <label htmlFor={name}>Company website (leave blank)</label>
      <input
        type="text"
        id={name}
        name={name}
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
