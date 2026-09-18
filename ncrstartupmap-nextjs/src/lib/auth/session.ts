export interface Session {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  expires: string;
}

export function createSession(user: { id: string; email: string; name?: string }): Session {
  return {
    user,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function verifySession(token: string): Session | null {
  // Simulated session verification
  if (token.length < 10) return null;
  return createSession({ id: "1", email: "user@example.com" });
}
