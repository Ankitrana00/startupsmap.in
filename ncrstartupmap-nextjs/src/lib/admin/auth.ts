import { compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "crypto";
import { getRedisClient } from "@/lib/cache/redis";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: "admin" | "moderator";
  createdAt: Date;
}

/**
 * P0-2 (audit C2): fail closed in production. Previously JWT_SECRET fell back
 * to a publicly-known string, so a prod boot without the env var silently
 * signed forgeable admin JWTs.
 *
 * The check is lazy (evaluated on first use, not at module load) because
 * Next.js imports route modules during `next build` with NODE_ENV=production
 * to collect page data — a module-load throw breaks the build even when the
 * runtime environment is correctly configured. At request time the behavior
 * is identical: missing secrets in production throw loudly instead of
 * running with a known key. Dev/test behavior is unchanged.
 */
const isProduction = () => process.env.NODE_ENV === "production";

function assertProductionSecret(name: string, value: string | undefined): void {
  if (isProduction() && !value) {
    throw new Error(
      `${name} is not set — refusing to initialize admin auth in production without it (fail-closed).`,
    );
  }
}

function getJwtSecret(): string {
  const value = process.env.JWT_SECRET;
  assertProductionSecret("JWT_SECRET", value);
  return value || "dev-only-change-in-production";
}

function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || "admin@startupsmap.in";
}

function getAdminPassword(): string {
  const value = process.env.ADMIN_PASSWORD || "";
  // verifyAdminCredentials already throws on an unset ADMIN_PASSWORD; this
  // request-time check extends the same fail-closed guarantee to boot time.
  assertProductionSecret("ADMIN_PASSWORD", value);
  return value;
}


// P1-2 (audit H1): short admin sessions. 30 days was only safe with
// rotation/revocation; 12h absolute expiry limits blast radius of a stolen
// cookie. Revocation below covers logout; expiry covers the rest.
const TOKEN_EXPIRY = "12h";

/** P1-2: exported so the login route can match the cookie maxAge to the JWT. */
export const TOKEN_TTL_SECONDS = 12 * 60 * 60;

/**
 * P1-2 (audit H1): deny-list of revoked token IDs (jti). Logout revokes the
 * session server-side instead of only deleting the cookie — a stolen token
 * replayed after logout is rejected until its natural expiry.
 */
const REVOKED_KEY_PREFIX = "admin:revoked:";

export async function revokeToken(jti: string, expiresInSeconds: number): Promise<void> {
  const store = getRedisClient();
  await store.set(
    `${REVOKED_KEY_PREFIX}${jti}`,
    "1",
    Math.max(1, Math.ceil(expiresInSeconds)),
  );
}

async function isTokenRevoked(jti: string): Promise<boolean> {
  const store = getRedisClient();
  return (await store.get(`${REVOKED_KEY_PREFIX}${jti}`)) !== null;
}

/**
 * P1-2 helper for /api/admin/logout: read a token's `jti` and remaining
 * lifetime WITHOUT accepting it as a valid session (used only after the
 * token has already been verified). Returns null for invalid/expired tokens.
 */
export async function peekTokenJti(
  token: string
): Promise<{ jti: string; expiresInSeconds: number } | null> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jwtVerify(token, secret);
    if (!payload.jti) return null;
    const expiresInSeconds =
      payload.exp === undefined
        ? TOKEN_TTL_SECONDS
        : Math.max(1, Math.ceil((payload.exp * 1000 - Date.now()) / 1000));
    return { jti: payload.jti, expiresInSeconds };
  } catch {
    return null;
  }
}

export async function generateAdminToken(user: AdminUser): Promise<string> {
  const secret = new TextEncoder().encode(getJwtSecret());
  return new SignJWT({ ...user, createdAt: user.createdAt.toISOString() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);
}

export async function verifyAdminToken(token: string): Promise<AdminUser | null> {
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jwtVerify(token, secret);

    // P1-2: reject tokens revoked via logout (deny-list check).
    if (payload.jti && (await isTokenRevoked(payload.jti))) {
      return null;
    }

    return {
      id: payload.id as string,
      username: payload.username as string,
      email: payload.email as string,
      role: (payload.role as "admin" | "moderator") || "admin",
      createdAt: new Date(payload.createdAt as string),
    };
  } catch {
    return null;
  }
}

export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<AdminUser | null> {
  const adminPassword = getAdminPassword();
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD not configured");
  }

  const adminEmail = getAdminEmail();
  if (email !== adminEmail) return null;

  const passwordMatch = await compare(password, adminPassword);
  if (!passwordMatch) return null;

  return {
    id: "admin-001",
    username: "admin",
    email: adminEmail,
    role: "admin",
    createdAt: new Date(),
  };
}

// Legacy token-based auth (for API endpoints)
export async function verifyAdmin(token: string): Promise<AdminUser | null> {
  // First try JWT token
  const user = await verifyAdminToken(token);
  if (user) return user;

  // Fallback to legacy token auth
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
  if (!ADMIN_TOKEN) return null;

  const expectedBuffer = Buffer.from(ADMIN_TOKEN);
  const providedBuffer = Buffer.from(token);
  if (expectedBuffer.length !== providedBuffer.length) return null;

  let match = 0;
  for (let i = 0; i < expectedBuffer.length; i++) {
    match |= expectedBuffer[i] ^ providedBuffer[i];
  }
  if (match !== 0) return null;

  return {
    id: "admin-001",
    username: "admin",
    email: getAdminEmail(),
    role: "admin",
    createdAt: new Date(),
  };
}

export async function requireAdmin(
  req: Request,
): Promise<{ user: AdminUser; next: () => void } | Response> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const user = await verifyAdmin(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 403 });
  }

  return { user, next: () => {} };
}
