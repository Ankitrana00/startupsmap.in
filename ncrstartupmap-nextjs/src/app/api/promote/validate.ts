import { z } from "zod";

export const promoteSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(100, "Company name must be at most 100 characters"),
  pocName: z
    .string()
    .trim()
    .min(1, "POC name is required")
    .max(100, "POC name must be at most 100 characters"),
  pocEmail: z.string().trim().min(1, "Email is required").email("Invalid email address"),
  contactNumber: z
    .string()
    .trim()
    .min(1, "Contact number is required")
    .regex(/^[0-9+\-\s()]{7,15}$/, "Invalid phone number (7–15 characters, digits and + - ( ) only)"),
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(1000, "Message must be at most 1000 characters"),
});

export type PromoteData = z.infer<typeof promoteSchema>;
