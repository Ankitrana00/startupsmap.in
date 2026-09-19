import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken, peekTokenJti, revokeToken } from "@/lib/admin/auth";
import { recordAdminAuth } from "@/lib/admin/audit-login";
import { getClientIp } from "@/lib/middleware/ip-utils";

/**
 * P1-2 (audit H1): logout now revokes the session server-side (jti deny-list)
 * instead of only deleting the cookie — a stolen token replayed after logout
 * is rejected until its natural expiry.
 * P3-4: the logout is recorded in the admin audit trail.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin-token")?.value;

  // Only revoke tokens that are currently valid; invalid/expired cookies
  // need no deny-list entry.
  if (token && (await verifyAdminToken(token))) {
    const meta = await peekTokenJti(token);
    if (meta) {
      await revokeToken(meta.jti, meta.expiresInSeconds);
    }
    recordAdminAuth("logout", {
      ip: getClientIp(request),
      requestId: request.headers.get("x-request-id") ?? undefined,
    });
  }

  cookieStore.delete("admin-token");

  return NextResponse.json(
    { success: true, message: "Logged out" },
    { status: 200 }
  );
}
