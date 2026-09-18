import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { applyFilters, uniqueValues, fetchStartups } from "@/lib/api/startups";
import type { Startup } from "@/lib/types/startup";
import { mockStartups } from "../../../fixtures/startups";

/**
 * C1 coverage: `fetchStartups` previously swallowed mapped-table errors and
 * returned [] (fake empty state). These tests pin the new contract: mapped /
 * config failures reject; unmapped-table failure still soft-degrades.
 *
 * The mock uses a getter for `isSupabaseConfigured` so the unconfigured test
 * can flip it via hoisted state, and per-table results keyed by table name.
 */
const supabaseState = vi.hoisted(() => ({
  configured: true,
  tables: {} as Record<string, { data: unknown; error: unknown }>,
}));

vi.mock("@/lib/supabase", () => ({
  get isSupabaseConfigured() {
    return supabaseState.configured;
  },
  supabase: {
    from: (tableName: string) => {
      const result = supabaseState.tables[tableName] ?? { data: [], error: null };
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(result),
      };
    },
  },
}));

function setTable(name: string, result: { data: unknown; error: unknown }) {
  supabaseState.tables[name] = result;
}

describe("startups API", () => {
  describe("applyFilters", () => {
    it("should return all startups when no filters applied", () => {
      const result = applyFilters(mockStartups, { area: null, sector: null, stage: null }, "");
      expect(result).toEqual(mockStartups);
    });

    it("should filter by area", () => {
      const result = applyFilters(
        mockStartups,
        { area: "Gurugram", sector: null, stage: null },
        "",
      );
      expect(result).toHaveLength(1);
      expect(result[0].area).toBe("Gurugram");
    });

    it("should filter by sector", () => {
      const result = applyFilters(mockStartups, { area: null, sector: "Fintech", stage: null }, "");
      expect(result).toHaveLength(1);
      expect(result[0].sector).toBe("Fintech");
    });

    it("should search by query", () => {
      const result = applyFilters(
        mockStartups,
        { area: null, sector: null, stage: null },
        "Zepwell",
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Zepwell");
    });

    it("should not crash when fields are null or undefined", () => {
      const rows = [
        { ...mockStartups[0], description: null },
        { ...mockStartups[1], name: undefined as unknown as string },
        { ...mockStartups[2], stage: null as unknown as Startup["stage"] },
      ] as unknown as Startup[];
      const result = applyFilters(
        rows,
        { area: null, sector: null, stage: null },
        "Zepwell",
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("s-001");
    });

    it("should match by address", () => {
      const rows = [
        { ...mockStartups[0], address: "Cyber City, Gurugram" },
        ...mockStartups.slice(1),
      ];
      const result = applyFilters(
        rows,
        { area: null, sector: null, stage: null },
        "cyber city",
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("s-001");
    });

    it("should return all rows for empty or whitespace query", () => {
      const empty = { area: null, sector: null, stage: null } as const;
      expect(applyFilters(mockStartups, { ...empty }, "")).toHaveLength(3);
      expect(applyFilters(mockStartups, { ...empty }, "   ")).toHaveLength(3);
    });
  });

  describe("uniqueValues", () => {
    it("should return unique areas", () => {
      const areas = uniqueValues(mockStartups, "area");
      expect(areas).toEqual(["Delhi", "Gurugram", "Noida"]);
    });

    it("should return unique sectors", () => {
      const sectors = uniqueValues(mockStartups, "sector");
      expect(sectors).toEqual(["Agritech", "Fintech", "Healthtech"]);
    });
  });
});

describe("fetchStartups", () => {
  beforeEach(() => {
    supabaseState.configured = true;
    supabaseState.tables = {};
  });

  afterEach(() => {
    supabaseState.configured = true;
    supabaseState.tables = {};
  });

  it("combines mapped and unmapped rows", async () => {
    setTable("startups", { data: [mockStartups[0]], error: null });
    setTable("unmapped_startups", {
      data: [
        {
          id: "u-1",
          name: "Unmapped Co",
          area: "Delhi",
          founded: "2023",
          sector: "AI",
          website: null,
          linkedin: null,
          description: null,
        },
      ],
      error: null,
    });
    const result = await fetchStartups();
    expect(result).toHaveLength(2);
    // Unmapped rows map onto the Startup shape with null coordinates and no
    // stage, so selectors route them to the Unmapped view.
    expect(result[1]).toMatchObject({ id: "u-1", lat: null, lng: null, stage: null });
  });

  it("rejects when the mapped-table query fails (no fake empty state)", async () => {
    setTable("startups", { data: null, error: { message: "db down" } });
    setTable("unmapped_startups", { data: [], error: null });
    await expect(fetchStartups()).rejects.toThrow("Failed to fetch startups");
  });

  it("soft-degrades when only the unmapped-table query fails", async () => {
    setTable("startups", { data: mockStartups, error: null });
    setTable("unmapped_startups", { data: null, error: { message: "db down" } });
    const result = await fetchStartups();
    expect(result).toEqual(mockStartups);
  });

  it("rejects when Supabase is not configured", async () => {
    supabaseState.configured = false;
    await expect(fetchStartups()).rejects.toThrow("Supabase is not configured");
  });
});

