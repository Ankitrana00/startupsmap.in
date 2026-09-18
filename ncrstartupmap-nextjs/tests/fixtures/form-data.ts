export const validSubmitData = {
  name: "Test Startup",
  description: "A test startup for validation",
  sector: "Fintech",
  stage: "Seed",
  area: "Gurugram",
  founded: 2024,
  is_hiring: true,
  lat: 28.4595,
  lng: 77.0266,
  website: "https://test.com",
  linkedin: "https://linkedin.com/company/test",
};

export const invalidSubmitData = {
  name: "",
  description: "Short",
  sector: "",
  stage: "",
  area: "",
  founded: 1800,
  is_hiring: null,
  lat: null,
  lng: null,
  website: "not-a-url",
  linkedin: null,
};

export const submitDataWithMissingFields = {
  name: "Incomplete Startup",
  sector: "Tech",
};
