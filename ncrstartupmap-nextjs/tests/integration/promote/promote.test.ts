import { describe, it, expect } from "vitest";
import { promoteSchema } from "@/app/api/promote/validate";

const validData = {
  companyName: "Acme Startup",
  pocName: "John Doe",
  pocEmail: "john@example.com",
  contactNumber: "+91 98765 43210",
  message: "We want to promote our startup on the map.",
};

describe("Promote API Integration", () => {
  describe("POST /api/promote", () => {
    it("should validate required fields", () => {
      const result = promoteSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should accept valid data", () => {
      const result = promoteSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should trim whitespace-padded fields", () => {
      const result = promoteSchema.safeParse({
        ...validData,
        companyName: "  Acme Startup  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.companyName).toBe("Acme Startup");
      }
    });

    it("should reject whitespace-only required fields", () => {
      const result = promoteSchema.safeParse({
        ...validData,
        pocName: "   ",
      });
      expect(result.success).toBe(false);
    });

    it("should reject an overly long company name", () => {
      const result = promoteSchema.safeParse({
        ...validData,
        companyName: "x".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("should reject an overly long message", () => {
      const result = promoteSchema.safeParse({
        ...validData,
        message: "x".repeat(1001),
      });
      expect(result.success).toBe(false);
    });

    it("should reject an invalid email", () => {
      const result = promoteSchema.safeParse({
        ...validData,
        pocEmail: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("should reject an invalid phone number", () => {
      const result = promoteSchema.safeParse({
        ...validData,
        contactNumber: "123",
      });
      expect(result.success).toBe(false);
    });
  });
});