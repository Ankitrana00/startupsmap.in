import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePromoteSubmit } from "@/lib/hooks/usePromoteSubmit";

// H1 coverage (mirror of useSubmit): the promote fetch is wired with
// AbortSignal.timeout(15000) and a timed-out request must surface a
// user-facing error rather than hanging on the submitting button.

const validPromoteData = {
  companyName: "Acme Startup",
  pocName: "John Doe",
  pocEmail: "john@example.com",
  contactNumber: "+91 98765 43210",
  message: "We want to promote our startup on the map.",
};

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

describe("usePromoteSubmit hook — H1 (timeout)", () => {
  it("passes AbortSignal.timeout(15000) to the promote fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { result } = renderHook(() => usePromoteSubmit());

    await act(async () => {
      await result.current.submit(validPromoteData);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts).toHaveProperty("signal");
    expect(callOpts.signal).toBeInstanceOf(AbortSignal);
  });

    it("surfaces a friendly timeout message when the fetch aborts", async () => {
    const abortErr = new DOMException("The signal has aborted", "AbortError");
    mockFetch.mockRejectedValueOnce(abortErr);

    const { result } = renderHook(() => usePromoteSubmit());

    await act(async () => {
      await result.current.submit(validPromoteData);
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBe("Request timed out — check your connection");
  });

  it("includes Retry-After cooldown in the 429 error message (H3)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Map([["Retry-After", "3600"]]),
      json: async () => ({ error: "Too many requests. Please try again later." }),
    });

    const { result } = renderHook(() => usePromoteSubmit());

    await act(async () => {
      await result.current.submit(validPromoteData);
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toContain("3600 seconds");
  });
});
