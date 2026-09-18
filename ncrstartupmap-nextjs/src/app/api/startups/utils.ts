export function buildSearchQuery(filters: {
  area?: string;
  sector?: string;
  stage?: string;
  query?: string;
}) {
  return { ...filters, query: filters.query || "" };
}
