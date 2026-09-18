import { randomBytes } from "crypto";

export function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

export function validateTokenFormat(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}
