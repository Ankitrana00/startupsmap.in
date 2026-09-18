import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ message: "WebSocket endpoint" });
}

export function POST() {
  return NextResponse.json({ message: "WebSocket endpoint" });
}
