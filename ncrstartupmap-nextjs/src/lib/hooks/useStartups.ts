import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchStartups } from "../api/startups";

export const startupsQueryOptions = () =>
  queryOptions({
    queryKey: ["startups"],
    queryFn: () => fetchStartups(),
    staleTime: 60_000,
    // C1: one fast retry before surfacing the error UI. TanStack's default is
    // 3 attempts with exponential backoff (~7s total) — too slow for the
    // primary landing fetch; after the single retry the user gets the error
    // state with a manual Retry button.
    retry: 1,
  });

export function useStartups() {
  return useQuery(startupsQueryOptions());
}
