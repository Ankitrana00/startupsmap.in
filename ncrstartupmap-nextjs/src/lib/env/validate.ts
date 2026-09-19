import { z } from "zod";

/**
 * P3-5 (audit L2): single source of truth for environment validation.
 *
 * This previously lived in two places: this file (authoritative — it runs at
 * boot from src/instrumentation.ts) and src/lib/env/schema.ts (dead fiction
 * that advertised DATABASE_URL/REDIS_HOST as required and was imported by
 * nothing). The dead copy is deleted; anything added here must also be added
 * to .env.example and docs/DEPLOYMENT.md.
 *
 * Optional-by-design: the app boots without Supabase/SMTP/Redis vars so local
 * development works out of the box; production readiness is enforced by
 * validateProdSecrets() via GET /api/ready (P1-7).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Required by the Supabase client on every request path.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  // Server-only. Not required to boot, but required in production (P0-3).
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  // KV store for rate limiting, idempotency keys and the list cache. Absent →
  // bounded in-memory fallback (dev only). Upstash REST API (HTTP, not TCP).
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  // Vercel KV injects the same credentials under these names.
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SUBMISSIONS_TO: z.string().optional(),
  PROMOTE_TO: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  NEXT_PUBLIC_BASE_URL: z.string().optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  LOG_LEVEL: z.enum(["0", "1", "2", "3"]).optional(),
  LOG_DIR: z.string().optional(),
  // scripts/*.mjs only (backup/restore/seed) — never read by the app.
  DATABASE_URL: z.string().optional(),
  BACKUP_DIR: z.string().optional(),
});

/** Secrets that must be present before serving production traffic (P0-2/P0-3). */
export const PROD_SECRET_KEYS = [
  "JWT_SECRET",
  "ADMIN_PASSWORD",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

/**
 * P1-7 (audit §7.10): production boot gate — the fail-closed checks from P0-2
 * and P0-3, centralized so /api/ready and instrumentation share one source
 * of truth. Returns which required production secrets are missing.
 */
export function validateProdSecrets(): { ok: boolean; missing: string[] } {
  const missing = PROD_SECRET_KEYS.filter((key) => !process.env[key]);
  return { ok: missing.length === 0, missing };
}

export function isProductionMode(): boolean {
  return process.env.NODE_ENV === "production";
}

export function validateEnv(): z.infer<typeof envSchema> {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}
