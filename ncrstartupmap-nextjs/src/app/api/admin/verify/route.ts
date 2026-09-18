import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin/auth";
import { cookies } from "next/headers";
import { reportServerError } from "@/lib/error/report-server-error";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-token");

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const user = await verifyAdminToken(token.value);
    if (!user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { authenticated: true, user },
      { status: 200 }
    );
  } catch (err) {
    reportServerError(err, { route: "api/admin/verify" });
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}