import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { FilterTray } from "@/components/toolbar/FilterTray";
import { useDashboardStore } from "@/lib/state/store";
import type { StartupStage } from "@/lib/types/startup";

const AREAS = ["Gurgaon", "Noida"];
const SECTORS = ["SaaS", "Fintech"];
const STAGES: readonly StartupStage[] = ["Idea", "Seed"];

function renderTray(isOpen: boolean, onClose = vi.fn()) {
  render(
    <FilterTray isOpen={isOpen} onClose={onClose} areas={AREAS} sectors={SECTORS} stages={STAGES} />,
  );
  return { onClose };
}

function resetStore() {
  useDashboardStore.setState({
    view: "map",
    search: "",
    filters: { area: null, sector: null, stage: null },
  });
}

beforeEach(resetStore);
afterEach(cleanup);

describe("FilterTray", () => {
  it("renders nothing when closed", () => {
    renderTray(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders dialog with search box and filter selects when open", () => {
    renderTray(true);
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Search startups" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Area" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Sector" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Stage" })).toBeTruthy();
  });

  it("closes on Escape", () => {
    const { onClose } = renderTray(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // L8: one Escape press used to clear the search input AND close the tray
  // (SearchBox handled the key while FilterTray listened on document with no
  // precedence rule). The contract is now two-step: Escape with text clears
  // the input and keeps the tray open; Escape on an empty input closes it.
  it("Escape with text in the search input clears it and keeps the tray open (L8)", () => {
    const { onClose } = renderTray(true);
    const input = screen.getByRole("searchbox", { name: "Search startups" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "pizza" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("a second Escape once the input is empty closes the tray (L8)", () => {
    const { onClose } = renderTray(true);
    const input = screen.getByRole("searchbox", { name: "Search startups" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "pizza" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on outside mousedown but not on clicks inside the tray", () => {
    const { onClose } = renderTray(true);

    // A mousedown inside the tray does not close it...
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();

    // ...while a mousedown outside the tray does.
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores mousedown inside toggleRef so the pill can close the tray (Problem #8)", () => {
    const toggleRef = { current: null as HTMLButtonElement | null };
    const onClose = vi.fn();
    render(
      <>
        <button ref={toggleRef} type="button">
          Toggle filters
        </button>
        <FilterTray
          isOpen
          onClose={onClose}
          areas={AREAS}
          sectors={SECTORS}
          stages={STAGES}
          toggleRef={toggleRef}
        />
      </>,
    );

    // The toggle pill must NOT trigger the outside-click close...
    fireEvent.mouseDown(screen.getByRole("button", { name: "Toggle filters" }));
    expect(onClose).not.toHaveBeenCalled();

    // ...while a genuine outside mousedown still does.
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("selecting a stage option calls setFilter (store updates)", () => {
    renderTray(true);
    fireEvent.change(screen.getByRole("combobox", { name: "Stage" }), {
      target: { value: "Idea" },
    });
    expect(useDashboardStore.getState().filters.stage).toBe("Idea");
  });

  it("selecting an area option calls setFilter (store updates)", () => {
    renderTray(true);
    fireEvent.change(screen.getByRole("combobox", { name: "Area" }), {
      target: { value: "Gurgaon" },
    });
    expect(useDashboardStore.getState().filters.area).toBe("Gurgaon");
  });

  it("'All x' option clears its filter", () => {
    useDashboardStore.setState({
      filters: { area: "Gurgaon", sector: null, stage: null },
    });
    renderTray(true);
    fireEvent.change(screen.getByRole("combobox", { name: "Area" }), {
      target: { value: "" },
    });
    expect(useDashboardStore.getState().filters.area).toBeNull();
  });

  it("Reset is disabled when nothing is active", () => {
    renderTray(true);
    const reset = screen.getByRole("button", { name: "Reset filters" }) as HTMLButtonElement;
    expect(reset.disabled).toBe(true);
  });

  it("Reset clears search and filters via resetFilters", () => {
    useDashboardStore.setState({
      search: "pizza",
      filters: { area: "Gurgaon", sector: "SaaS", stage: null },
    });
    renderTray(true);
    const reset = screen.getByRole("button", { name: "Reset filters" }) as HTMLButtonElement;
    expect(reset.disabled).toBe(false);
    fireEvent.click(reset);
    const state = useDashboardStore.getState();
    expect(state.filters.area).toBeNull();
    expect(state.filters.sector).toBeNull();
    expect(state.search).toBe("");
  });

  it("returns focus to the toggle button when the tray closes", () => {
    const onClose = vi.fn();
    const tree = (open: boolean) => (
      <>
        <button type="button" data-testid="toggle">
          Filters
        </button>
        <FilterTray isOpen={open} onClose={onClose} areas={AREAS} sectors={SECTORS} stages={STAGES} />
      </>
    );
    const { rerender } = render(tree(false));
    const toggle = screen.getByTestId("toggle");
    toggle.focus();
    expect(document.activeElement).toBe(toggle);

    rerender(tree(true));
    rerender(tree(false));
    expect(document.activeElement).toBe(toggle);
  });

  it("typing in SearchBox commits a debounced value to the store", () => {
    vi.useFakeTimers();
    try {
      renderTray(true);
      const input = screen.getByRole("searchbox", { name: "Search startups" }) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "pizza" } });
      // Debounce is 150ms — nothing committed yet.
      expect(useDashboardStore.getState().search).toBe("");
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(useDashboardStore.getState().search).toBe("pizza");
    } finally {
      vi.useRealTimers();
    }
  });
});
