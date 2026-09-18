interface StartupFactoryOptions {
  name?: string;
  sector?: string;
  stage?: string;
  area?: string;
  hasCoordinates?: boolean;
  isHiring?: boolean | null;
}

export function createStartupFactory(options: StartupFactoryOptions = {}) {
  return {
    id: options.name ? `test-${options.name.toLowerCase()}` : crypto.randomUUID(),
    name: options.name || `Test Startup ${Math.random().toString(36).substring(7)}`,
    description: "Test startup description",
    sector: options.sector || "Fintech",
    stage: options.stage || "Seed",
    area: options.area || "Gurugram",
    founded: 2024,
    is_hiring: options.isHiring ?? null,
    lat: options.hasCoordinates ? 28.4595 : null,
    lng: options.hasCoordinates ? 77.0266 : null,
    website: null,
    linkedin: null,
  };
}

export const startupFactory = {
  create: createStartupFactory,
  createMany: (count: number, options?: StartupFactoryOptions) =>
    Array.from({ length: count }, () => createStartupFactory(options)),
};
