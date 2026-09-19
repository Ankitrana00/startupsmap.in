import { NextResponse } from "next/server";

/** P1-7: liveness probe — process is up, no dependency calls. */
export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
