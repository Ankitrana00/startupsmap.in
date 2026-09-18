export type Role = "admin" | "moderator" | "user";

export const PERMISSIONS: Record<Role, string[]> = {
  admin: [
    "read:startups",
    "write:startups",
    "delete:startups",
    "read:users",
    "write:users",
    "delete:users",
    "read:submissions",
    "write:submissions",
    "delete:submissions",
    "manage:settings",
  ],
  moderator: ["read:startups", "write:startups", "read:submissions", "write:submissions"],
  user: ["read:startups"],
};

export function hasPermission(role: Role, permission: string): boolean {
  return PERMISSIONS[role]?.includes(permission) || false;
}
