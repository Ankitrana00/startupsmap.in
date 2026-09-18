import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useShowMore } from "@/lib/hooks/useShowMore";

describe("useShowMore", () => {
  it("starts at step", () => {
    const { result } = renderHook(() => useShowMore(692, 24, "k0"));
    expect(result.current.visible).toBe(24);
    expect(result.current.remaining).toBe(668);
    expect(result.current.hasMore).toBe(true);
  });

  it("showMore adds a step", () => {
    const { result } = renderHook(() => useShowMore(692, 24, "k0"));
    act(() => result.current.showMore());
    expect(result.current.visible).toBe(48);
    act(() => result.current.showMore());
    expect(result.current.visible).toBe(72);
  });

  it("clamps visible to total and reports no more", () => {
    const { result } = renderHook(() => useShowMore(50, 24, "k0"));
    act(() => result.current.showMore()); // 48
    act(() => result.current.showMore()); // would be 72 -> clamp 50
    expect(result.current.visible).toBe(50);
    expect(result.current.remaining).toBe(0);
    expect(result.current.hasMore).toBe(false);
  });

  it("handles total <= step (button-less case)", () => {
    const { result } = renderHook(() => useShowMore(10, 24, "k0"));
    expect(result.current.visible).toBe(10);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it("handles total = 0", () => {
    const { result } = renderHook(() => useShowMore(0, 24, "k0"));
    expect(result.current.visible).toBe(0);
    expect(result.current.hasMore).toBe(false);
  });

  it("resets to step when resetKey changes (filter/search change)", () => {
    const { result, rerender } = renderHook(
      ({ total, resetKey }) => useShowMore(total, 24, resetKey),
      { initialProps: { total: 692, resetKey: "k0" } },
    );
    act(() => result.current.showMore());
    expect(result.current.visible).toBe(48);

    // Filter change: total shrinks below stale visible -> clamp, no OOB
    rerender({ total: 5, resetKey: "k1" });
    expect(result.current.visible).toBe(5);
    expect(result.current.hasMore).toBe(false);

    // Same resetKey (unrelated rerender): state preserved
    rerender({ total: 692, resetKey: "k1" });
    expect(result.current.visible).toBe(5);
  });

  it("stays stable across same-key rerenders (no reset on unrelated render)", () => {
    const { result, rerender } = renderHook(
      ({ total, resetKey }) => useShowMore(total, 24, resetKey),
      { initialProps: { total: 692, resetKey: "same" } },
    );
    act(() => result.current.showMore());
    rerender({ total: 700, resetKey: "same" });
    expect(result.current.visible).toBe(48);
  });
});
