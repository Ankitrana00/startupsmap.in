export const VIEW_MODES = ["map", "grid", "unmapped"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const AREAS = [
  "Delhi",
  "Gurugram",
  "Noida",
  "Faridabad",
  "Ghaziabad",
  "Sonipat",
  "Greater Noida",
  "Bahadurgarh",
  "Manesar",
] as const;

export const SECTORS = [
  "AI",
  "Fintech",
  "Healthtech",
  "Edtech",
  "E-commerce",
  "SaaS",
  "CleanTech",
  "Gaming",
  "Robotics",
  "Logistics",
] as const;

export const STAGES = ["Idea", "Seed", "Series A", "Series B", "Growth"] as const;
