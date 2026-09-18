import { z } from "zod";

export const jobSchema = z.object({
  startupId: z.string().min(1, "Startup ID is required"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(1, "Location is required"),
  type: z.enum(["full-time", "part-time", "contract", "remote"]),
  salary: z.string().optional(),
});

export type JobFormData = z.infer<typeof jobSchema>;

export function validateJobData(data: unknown): { valid: boolean; errors?: string[] } {
  const result = jobSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((e) => e.message),
    };
  }
  return { valid: true };
}
