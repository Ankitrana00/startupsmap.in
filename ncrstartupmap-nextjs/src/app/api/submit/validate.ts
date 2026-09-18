import { z } from "zod";

export const SECTORS = ["Fintech", "Healthtech", "Edtech", "E-commerce", "AI", "SaaS"] as const;
export const STAGES = ["Idea", "Seed", "Series A", "Series B", "Growth"] as const;
export const AREAS = ["Delhi", "Gurugram", "Noida", "Faridabad", "Ghaziabad"] as const;

export const submitSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(1000, "Description must be at most 1000 characters"),
  sector: z.enum(SECTORS),
  stage: z.enum(STAGES),
  area: z.enum(AREAS),
  founded: z.number().min(1900).max(2100),
  website: z.string().url().or(z.literal("")).optional(),
  linkedin: z.string().url().or(z.literal("")).optional(),
  is_hiring: z.boolean().nullable(),
  address: z
    .string()
    .min(1, "Address is required")
    .max(255, "Address must be at most 255 characters"),
  lat: z.preprocess(
    // null, "", and whitespace-only strings are treated as NaN (invalid) —
    // the product requires coordinates, so garbage is rejected, never
    // silently converted to 0.
    (val) =>
      val === null || (typeof val === "string" && val.trim() === "") ? Number.NaN : Number(val),
    z
      .number()
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90")
  ),
  lng: z.preprocess(
    (val) =>
      val === null || (typeof val === "string" && val.trim() === "") ? Number.NaN : Number(val),
    z
      .number()
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180")
  ),
});

export type SubmitData = z.infer<typeof submitSchema>;
