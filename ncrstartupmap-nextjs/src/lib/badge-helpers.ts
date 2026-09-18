export type BadgeTone = "neutral" | "hiring" | "accent" | "warn";

export function hiringTone(isHiring: boolean | null): BadgeTone {
  if (isHiring === true) return "hiring";
  if (isHiring === false) return "neutral";
  return "accent";
}

export function hiringLabel(isHiring: boolean | null): string {
  if (isHiring === true) return "Hiring";
  if (isHiring === false) return "Not hiring";
  return "Unconfirmed";
}
