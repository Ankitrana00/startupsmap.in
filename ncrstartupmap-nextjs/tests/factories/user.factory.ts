interface UserFactoryOptions {
  email?: string;
  name?: string;
  role?: "admin" | "moderator" | "user";
}

export function createUserFactory(options: UserFactoryOptions = {}) {
  return {
    id: crypto.randomUUID(),
    email: options.email || `user${Math.random().toString(36).substring(7)}@example.com`,
    name: options.name || `Test User ${Math.random().toString(36).substring(7)}`,
    role: options.role || "user",
    createdAt: new Date(),
  };
}

export const userFactory = {
  create: createUserFactory,
  createAdmin: () => createUserFactory({ role: "admin" }),
  createModerator: () => createUserFactory({ role: "moderator" }),
  createMany: (count: number, options?: UserFactoryOptions) =>
    Array.from({ length: count }, () => createUserFactory(options)),
};
