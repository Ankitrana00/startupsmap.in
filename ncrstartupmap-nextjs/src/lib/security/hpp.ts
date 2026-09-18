import { NextResponse } from "next/server";

export function hppMiddleware(req: Request): NextResponse | null {
  const url = new URL(req.url);
  const params = url.searchParams;
  const paramCounts = new Map<string, number>();

  for (const [key] of params) {
    paramCounts.set(key, (paramCounts.get(key) || 0) + 1);
  }

  for (const count of paramCounts.values()) {
    if (count > 1) {
      return NextResponse.json({ error: "Duplicate parameters detected" }, { status: 400 });
    }
  }

  return null;
}
