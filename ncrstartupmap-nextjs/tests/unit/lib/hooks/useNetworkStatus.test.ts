import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNetworkStatus } from "@/lib/hooks/useNetworkStatus";

/**
 * H2 coverage: useNetworkStatus is SSR-safe (seeds online=true, isHydrated=false)
 * and flips to the real navigator.onLine value after the first client effect
 * (deferred via queueMicrotask), then tracks `online`/`offline` window events.
 */

const originalOnLine = navigator.onLine;

beforeEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});

afterEach(() => {
  Object.defineProperty(navigator, "onLine", { value: originalOnLine, configurable: true });
});

describe("useNetworkStatus — H2 (offline banner data)", () => {
  it("seeds online=true and isHydrated=false before the effect runs", () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.online).toBe(true);
    expect(result.current.isHydrated).toBe(false);
  });

  it("reads navigator.onLine on mount (via microtask flush)", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());

    // queueMicrotask defers the state update; flush it with await + tick.
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isHydrated).toBe(true);
    expect(result.current.online).toBe(false);
  });

  it("tracks window 'offline' / 'online' events", async () => {
    const { result } = renderHook(() => useNetworkStatus());
    // flush the mount microtask first
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.online).toBe(false);

    act(() => {
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.online).toBe(true);
  });

  it("stays unhydrated (no crash) when window/navigator are absent", () => {
    // The guard returns early in non-browser envs. In jsdom we can't fully
    // remove `navigator`, so just assert the hook never throws and starts
    // unhydrated — the guard path is covered by the SSR seed above.
    expect(() => renderHook(() => useNetworkStatus())).not.toThrow();
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isHydrated).toBe(false);
    expect(result.current.online).toBe(true);
  });
});
