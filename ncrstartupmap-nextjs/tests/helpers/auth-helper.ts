export function createTestToken(role: "admin" | "moderator" | "user" = "user"): string {
  return `test-token-${role}-${Math.random().toString(36).substring(7)}`;
}

export function createAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function signInAsAdmin(): Promise<{
  token: string;
  user: { id: string; role: string };
}> {
  const token = createTestToken("admin");
  return { token, user: { id: "admin-1", role: "admin" } };
}

export async function signInAsUser(): Promise<{
  token: string;
  user: { id: string; role: string };
}> {
  const token = createTestToken("user");
  return { token, user: { id: "user-1", role: "user" } };
}
