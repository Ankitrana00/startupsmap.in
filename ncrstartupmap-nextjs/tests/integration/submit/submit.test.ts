import { describe, it, expect } from "vitest";
import { submitSchema } from "@/app/api/submit/validate";

describe("Submit API Integration", () => {
  describe("POST /api/submit", () => {
    it("should validate required fields", () => {
      const result = submitSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should accept valid data with address and coordinates", () => {
      const validData = {
        name: "Test Startup",
        email: "test@example.com",
        description: "A test",
        sector: "Fintech",
        stage: "Seed",
        area: "Gurugram",
        founded: 2024,
        is_hiring: null,
        address: "123 Test St, Gurugram",
        lat: 28.4595,
        lng: 77.0266,
      };
      const result = submitSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const invalidData = {
        name: "Test Startup",
        email: "not-an-email",
        description: "A test",
        sector: "Fintech",
        stage: "Seed",
        area: "Gurugram",
        founded: 2024,
        is_hiring: null,
        address: "123 Test St, Gurugram",
        lat: 28.4595,
        lng: 77.0266,
      };
      const result = submitSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject null lat/lng (coordinates are required)", () => {
      const unmapped = {
        name: "Test Startup",
        description: "A test",
        sector: "Fintech",
        stage: "Seed",
        area: "Gurugram",
        founded: 2024,
        is_hiring: null,
        address: "123 Test St, Gurugram",
        lat: null,
        lng: null,
      };
      const result = submitSchema.safeParse(unmapped);
      expect(result.success).toBe(false);
    });

    it("should reject whitespace-only lat (never silently 0)", () => {
      const whitespaceLat = {
        name: "Test Startup",
        description: "A test",
        sector: "Fintech",
        stage: "Seed",
        area: "Gurugram",
        founded: 2024,
        is_hiring: null,
        address: "123 Test St, Gurugram",
        lat: " ",
        lng: 77.0266,
      };
      const result = submitSchema.safeParse(whitespaceLat);
      expect(result.success).toBe(false);
    });

    it("should reject missing address", () => {
      const invalidData = {
        name: "Test Startup",
        description: "A test",
        sector: "Fintech",
        stage: "Seed",
        area: "Gurugram",
        founded: 2024,
        address: "",
        lat: 28.4595,
        lng: 77.0266,
      };
      const result = submitSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid lat/lng (non-numeric strings)", () => {
      const invalidData = {
        name: "Test Startup",
        description: "A test",
        sector: "Fintech",
        stage: "Seed",
        area: "Gurugram",
        founded: 2024,
        address: "123 Test St",
        lat: "invalid",
        lng: 77.0266,
      };
      const result = submitSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid stage (schema enforces the stage enum)", () => {
      const anyStage = {
        name: "Test",
        description: "Test",
        sector: "Fintech",
        stage: "Invalid Stage",
        area: "Gurugram",
        founded: 2024,
        is_hiring: null,
        address: "123 Test St",
        lat: null,
        lng: null,
      };
      const result = submitSchema.safeParse(anyStage);
      expect(result.success).toBe(false);
    });

    it("should reject out-of-range lat/lng", () => {
      const badCoords = {
        name: "Test",
        description: "Test",
        sector: "Fintech",
        stage: "Seed",
        area: "Gurugram",
        founded: 2024,
        is_hiring: null,
        address: "123 Test St",
        lat: 999,
        lng: 77.0266,
      };
      const result = submitSchema.safeParse(badCoords);
      expect(result.success).toBe(false);
    });
  });
});
