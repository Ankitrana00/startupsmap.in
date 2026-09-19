import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  insertStartupRow,
  isServiceRoleConfigured,
  isSupabaseConfigured,
  supabase,
} from "@/lib/supabase";
import { reportServerError } from "@/lib/error/report-server-error";
import { getClientIp } from "@/lib/middleware/ip-utils";
import { verifyAdminToken } from "@/lib/admin/auth";
import { isSameOrigin } from "@/lib/security/same-origin";
import { submitSchema } from "@/app/api/submit/validate";
import {
  getCachedStartupsList,
  invalidateStartupsList,
  setCachedStartupsList,
} from "@/lib/cache/startups-cache";
import { readLimiter, writeLimiter } from "./rate-limit";

/** P2-2 (audit M2): list pagination — page (1-based), limit capped at 100. */
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/** 503 with a helpful message when Supabase env vars are missing in .env */
function dbNotConfigured() {
  return NextResponse.json(
    {
      error:
        "Database not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env, then restart the dev server.",
    },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  // P1-6 (audit M7): the public list endpoint had no rate limit.
  const ip = getClientIp(request);
  // P2-6: correlation ID for the Sentry tags below.
  const requestId = request.headers.get("x-request-id") ?? undefined;
  if (!(await readLimiter.check(ip))) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: {
          "Retry-After": String(await readLimiter.retryAfterSeconds(ip)),
        },
      },
    );
  }

  if (!isSupabaseConfigured) return dbNotConfigured();

  // P2-2 (audit M2): bounded, paginated read replaces the unbounded
  // select("*"). Invalid params fall back to the defaults (never a 500).
  const url = new URL(request.url);
  const query = listQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  const { page, limit } = query.success ? query.data : { page: 1, limit: 50 };
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // P3-2 (audit §3): serve a recently-fetched page from the shared cache
  // (60s TTL, matching the client's staleTime). Invalidated by the admin POST
  // below, so an inserted row is visible on the next request.
  const cached = await getCachedStartupsList(page, limit);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "x-cache": "HIT" },
    });
  }

  // count: "exact" returns total rows alongside the page for the meta block.
  const { data, error, count } = await supabase
    .from("startups")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    reportServerError(error, { route: "api/startups", layer: "db", requestId });
    return NextResponse.json(
      { error: "Failed to fetch startups" },
      { status: 500 }
    );
  }

  const total = count ?? 0;
  const payload = {
    startups: data ?? [],
    meta: {
      total,
      page,
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };

  // P3-2: cache the miss for the next caller (failures are swallowed inside).
  await setCachedStartupsList(page, limit, payload);

  return NextResponse.json(payload, { headers: { "x-cache": "MISS" } });
}

/**
 * P0-1 (audit C1): admin-only write. This route previously inserted into the
 * live `startups` table with no auth, no rate limit and no origin check,
 * bypassing the moderated /api/submit flow. Public creation must go through
 * /api/submit; this endpoint is for authenticated admin actions only.
 */
export async function POST(request: Request) {
  // Same cross-site form-abuse guard as /api/submit.
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // P2-6: correlation ID for the Sentry tag in the catch block below.
  const requestId = request.headers.get("x-request-id") ?? undefined;

  // Rate limit before any parsing work (same ordering as /api/submit).
  // P1-3: centralized, x-real-ip-first IP extraction.
  const ip = getClientIp(request);
  if (!(await writeLimiter.check(ip))) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(await writeLimiter.retryAfterSeconds(ip)),
        },
      },
    );
  }

  // Require a valid admin session cookie (same contract as /api/admin/verify).
  const cookieStore = await cookies();
  const token = cookieStore.get("admin-token");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await verifyAdminToken(token.value);
  if (!admin) {
    return NextResponse.json({ error: "Invalid admin session" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = submitSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: result.error.flatten() },
      { status: 400 }
    );
  }

  if (!isServiceRoleConfigured) {
    return NextResponse.json(
      {
        error:
          "Server write credentials not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env, then restart the dev server.",
      },
      { status: 503 },
    );
  }

  try {
    // P0-3: service-role insert with an explicit column allowlist —
    // the validated payload is never spread into the query.
    const data = await insertStartupRow(result.data);
    // P3-2: an authorized insert makes every cached list page stale — drop them
    // so the next GET returns the new row instead of a 60s-old snapshot.
    await invalidateStartupsList();
    // P2-3 (audit M3): same success envelope as /api/submit and /api/promote
    // ({ success, message, data }) instead of a bare { message, data }.
    return NextResponse.json(
      { success: true, message: "Startup submitted", data },
      { status: 201 }
    );
  } catch (err) {
    reportServerError(err, { route: "api/startups", layer: "db", requestId });
    return NextResponse.json(
      { error: "Failed to save startup" },
      { status: 500 }
    );
  }
}
