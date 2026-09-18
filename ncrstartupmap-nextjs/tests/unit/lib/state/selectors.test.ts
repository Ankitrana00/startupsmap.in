import { describe, it, expect } from "vitest";
import { selectCounts, selectMapped, selectUnmapped } from "@/lib/state/selectors";
import type { Startup } from "@/lib/types/startup";

describe("selectors", () => {
  const rows = [
    { id: "1", is_hiring: true, lat: 1, lng: 1 },
    { id: "2", is_hiring: false, lat: 1, lng: 1 },
    { id: "3", is_hiring: null, lat: null, lng: null },
    { id: "4", is_hiring: null, lat: 1, lng: null },
  ] as Startup[];

  it("counts hiring/mapped buckets in a single pass", () => {
    expect(selectCounts(rows)).toEqual({
      total: 4,
      hiring: 1,
      notHiring: 1,
      unconfirmed: 2,
      mapped: 2,
      unmapped: 2,
    });
  });

  it("handles the empty list", () => {
    expect(selectCounts([])).toEqual({
      total: 0,
      hiring: 0,
      notHiring: 0,
      unconfirmed: 0,
      mapped: 0,
      unmapped: 0,
    });
  });

  it("splits mapped and unmapped rows", () => {
    expect(selectMapped(rows).map((s) => s.id)).toEqual(["1", "2"]);
    expect(selectUnmapped(rows).map((s) => s.id)).toEqual(["3", "4"]);
  });
});