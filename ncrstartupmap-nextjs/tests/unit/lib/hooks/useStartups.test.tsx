import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useStartups } from "@/lib/hooks/useStartups";
import { mockStartups } from "../../../fixtures/startups";

const { fetchStartupsMock } = vi.hoisted(() => ({
  fetchStartupsMock: vi.fn(),
}));

vi.mock("@/lib/api/startups", () => ({
  fetchStartups: fetchStartupsMock,
}));

fetchStartupsMock.mockResolvedValue(mockStartups);

function renderHookWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useStartups(), { wrapper });
}

describe("useStartups hook", () => {
  it("should return startups data", async () => {
    const { result } = renderHookWithClient();

    await vi.waitFor(() => {
      expect(result.current.data).toEqual(mockStartups);
    });
  });

  it("should have isLoading state", async () => {
    const { result } = renderHookWithClient();

    expect(result.current.isLoading).toBe(true);

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe("useStartups hook — error paths (C1)", () => {
  beforeEach(() => {
    fetchStartupsMock.mockReset();
    fetchStartupsMock.mockResolvedValue(mockStartups);
  });

  it("surfaces isError after one retry, then recovers via refetch", async () => {
    // retry: 1 → the query calls the fetcher twice, then errors out instead of
    // hanging through TanStack's default 3-attempt backoff.
    fetchStartupsMock
      .mockRejectedValueOnce(new Error("db down"))
      .mockRejectedValueOnce(new Error("db down"));
    const { result } = renderHookWithClient();
    expect(result.current.isPending).toBe(true);
    await vi.waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 },
    );
    expect(result.current.data).toBeUndefined();
    // The dashboard's Retry button calls refetch() — it must recover when the
    // API comes back. Assert via waitFor: the refetch promise resolves when
    // the cache updates, which can land a tick before React re-renders.
    fetchStartupsMock.mockResolvedValueOnce(mockStartups);
    await result.current.refetch();
    await vi.waitFor(
      () => {
        expect(result.current.isError).toBe(false);
      },
      { timeout: 5000 },
    );
    expect(result.current.data).toEqual(mockStartups);
  });
});

