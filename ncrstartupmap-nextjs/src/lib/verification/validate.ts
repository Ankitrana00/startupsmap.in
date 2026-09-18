import { validateTokenFormat } from "./token";

export async function validateVerificationToken(
  token: string,
  expectedToken: string,
): Promise<boolean> {
  if (!validateTokenFormat(token)) return false;
  if (!validateTokenFormat(expectedToken)) return false;

  const tokenBuffer = Buffer.from(token, "hex");
  const expectedBuffer = Buffer.from(expectedToken, "hex");
  if (tokenBuffer.length !== expectedBuffer.length) return false;

  let match = 0;
  for (let i = 0; i < tokenBuffer.length; i++) {
    match |= tokenBuffer[i] ^ expectedBuffer[i];
  }
  return match === 0;
}

export async function verifyStartupToken(token: string, _startupId: string): Promise<boolean> {
  // Simulated verification
  return token.length === 64;
}
