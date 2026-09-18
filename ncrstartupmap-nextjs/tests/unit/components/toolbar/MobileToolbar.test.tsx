import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MobileToolbar } from "@/components/toolbar/MobileToolbar";
import { useDashboardStore } from "@/lib/state/store";
import type { StartupStage } from "@/lib/types/startup";

const AREAS = ["Gurgaon", "Noida"];
const SECTORS = ["SaaS", "Fintech"];
const STAGES: readonly StartupStage[] = ["Idea", "Seed"];

function renderToolbar() {
  render(<MobileToolbar areas={AREAS} sectors={SECTORS} stages={STAGES} />);
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

describe("MobileToolbar", () => {
  it("renders brand, Filters button, submit link and view toggle", () => {
    renderToolbar();
    expect(screen.getByRole("link", { name: "startupsmap.in — Home" })).toBeTruthy();
    expect(screen.getByText("startupsmap.in")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Toggle filters" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Submit a startup" })).toBeTruthy();
    const submit = screen.getByRole("link", { name: "Submit a startup" }) as HTMLAnchorElement;
    expect(submit.getAttribute("href")).toBe("/submit");
    expect(screen.getByRole("group", { name: "Choose view" })).toBeTruthy();
  });

  it("opens the FilterTray on Filters click and toggles aria-expanded", () => {
    renderToolbar();
    const filtersBtn = screen.getByRole("button", { name: "Toggle filters" });
    expect(filtersBtn.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(filtersBtn);
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeTruthy();
    expect(filtersBtn.getAttribute("aria-expanded")).toBe("true");
  });

  it("closes the FilterTray when the Filters pill is clicked while open (Problem #8)", () => {
    renderToolbar();
    const filtersBtn = screen.getByRole("button", { name: "Toggle filters" });
    fireEvent.click(filtersBtn);
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeTruthy();

    // The pill's mousedown must NOT close the tray (it is the toggle)...
    fireEvent.mouseDown(filtersBtn);
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeTruthy();

    // ...and the pill's click closes it.
    fireEvent.click(filtersBtn);
    expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull();
    expect(filtersBtn.getAttribute("aria-expanded")).toBe("false");
  });

  it("Filters button shows active style when a filter is set", () => {
    useDashboardStore.setState({
      filters: { area: "Gurgaon", sector: null, stage: null },
    });
    renderToolbar();
    const filtersBtn = screen.getByRole("button", { name: "Toggle filters" });
    expect(filtersBtn.className).toContain("bg-primary");
  });

  it("Filters button shows active style when search is set", () => {
    useDashboardStore.setState({ search: "fintech" });
    renderToolbar();
    const filtersBtn = screen.getByRole("button", { name: "Toggle filters" });
    expect(filtersBtn.className).toContain("bg-primary");
  });

  it("Filters button shows inactive style with no filters or search", () => {
    renderToolbar();
    const filtersBtn = screen.getByRole("button", { name: "Toggle filters" });
    expect(filtersBtn.className).not.toContain("bg-primary");
    expect(filtersBtn.className).toContain("bg-surface");
  });
});
