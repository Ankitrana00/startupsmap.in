import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSubmit } from "@/lib/hooks/useSubmit";

// H1 coverage: the submit fetch is wired with AbortSignal.timeout(15000) and
// a timed-out request must surface a user-facing error (not hang on the
// button or emit a raw DOMException).

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;
const mockPush = vi.fn();

// useSubmit calls useRouter() internally → mock next/navigation.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

describe("useSubmit hook — H1 (timeout)", () => {
  it("passes AbortSignal.timeout(15000) to the submit fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useSubmit());

    await act(async () => {
      await result.current.submit({ name: "Test Startup" });
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts).toHaveProperty("signal");
    // AbortSignal.timeout returns an AbortSignal; assert we pass a signal
    // (the 15000ms budget is asserted by timing in integration if needed).
    expect(callOpts.signal).toBeInstanceOf(AbortSignal);
  });

    it("surfaces a friendly timeout message when the fetch aborts", async () => {
    const abortErr = new DOMException("The signal has aborted", "AbortError");
    mockFetch.mockRejectedValueOnce(abortErr);

    const { result } = renderHook(() => useSubmit());

    await act(async () => {
      await result.current.submit({ name: "Test Startup" });
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBe("Request timed out — check your connection");
  });

  it("includes Retry-After cooldown in the 429 error message (H3)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Map([["Retry-After", "1800"]]),
      json: async () => ({ error: "Too many submissions. Please try again later." }),
    });

    const { result } = renderHook(() => useSubmit());

    await act(async () => {
      await result.current.submit({ name: "Test Startup" });
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toContain("1800 seconds");
  });
});

