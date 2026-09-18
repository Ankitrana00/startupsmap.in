import { compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: "admin" | "moderator";
  createdAt: Date;
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-in-production";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@startupsmap.in";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

// JWT token expiry (30 days)
const TOKEN_EXPIRY = "30d";

export async function generateAdminToken(user: AdminUser): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ ...user, createdAt: user.createdAt.toISOString() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);
}

export async function verifyAdminToken(token: string): Promise<AdminUser | null> {
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
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
  if (!ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD not configured");
  }

  if (email !== ADMIN_EMAIL) return null;
  
  const passwordMatch = await compare(password, ADMIN_PASSWORD);
  if (!passwordMatch) return null;

  return {
    id: "admin-001",
    username: "admin",
    email: ADMIN_EMAIL,
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
    email: ADMIN_EMAIL,
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
