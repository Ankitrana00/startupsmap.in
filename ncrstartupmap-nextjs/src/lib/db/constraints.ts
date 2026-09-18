export const STARTUP_CONSTRAINTS = {
  name: {
    minLength: 1,
    maxLength: 255,
  },
  description: {
    minLength: 1,
    maxLength: 1000,
  },
  sector: {
    minLength: 1,
    maxLength: 100,
  },
  stage: {
    minLength: 1,
    maxLength: 50,
  },
  area: {
    minLength: 1,
    maxLength: 100,
  },
  founded: {
    min: 1900,
    max: 2101,
  },
  website: {
    url: true,
  },
  linkedin: {
    url: true,
  },
} as const;
