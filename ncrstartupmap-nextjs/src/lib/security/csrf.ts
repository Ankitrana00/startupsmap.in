import { randomBytes } from "crypto";

const CSRF_TOKEN_LENGTH = 32;
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

const tokens = new Map<string, number>();

export function generateCSRFToken(): string {
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
  tokens.set(token, Date.now());
  return token;
}

export function verifyCSRFToken(token: string): boolean {
  const expiry = tokens.get(token);
  if (!expiry) return false;
  if (Date.now() - expiry > TOKEN_EXPIRY) {
    tokens.delete(token);
    return false;
  }
  return true;
}

export function removeCSRFToken(token: string): void {
  tokens.delete(token);
}
