import { randomBytes } from "crypto";

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface TokenWithExpiry {
  token: string;
  expiresAt: number;
}

export function createTokenWithExpiry(): TokenWithExpiry {
  return {
    token: randomBytes(32).toString("hex"),
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
  };
}

export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

export function getTimeUntilExpiry(expiresAt: number): number {
  return Math.max(0, expiresAt - Date.now());
}
