import { NextResponse } from "next/server";
import { startupSeed } from "@/lib/data/startups";
import { buildSearchQuery } from "./utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const area = searchParams.get("area") || undefined;
  const sector = searchParams.get("sector") || undefined;
  const stage = searchParams.get("stage") || undefined;

  const filters = buildSearchQuery({ area, sector, stage, query });

  let results = startupSeed;

  if (filters.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        (s.sector ?? "").toLowerCase().includes(q)
    );
  }

  if (filters.area) {
    results = results.filter((s) => s.area === filters.area);
  }
  if (filters.sector) {
    results = results.filter((s) => s.sector === filters.sector);
  }
  if (filters.stage) {
    results = results.filter((s) => s.stage === filters.stage);
  }

  return NextResponse.json({ results, query: filters.query });
}
